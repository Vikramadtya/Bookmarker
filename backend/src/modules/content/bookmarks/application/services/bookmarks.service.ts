import { EntitlementsService } from '@identity/billing/entitlements.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Agenda } from 'agenda';
import {
  BulkUpdate,
  IBookmarkRepository,
} from '../../domain/repositories/bookmark.repository.interface';
import { Bookmark } from '../../domain/entities/bookmark.entity';
import { CreateBookmarkDto } from '../../presentation/http/dto/create-bookmark.dto';
import { UpdateBookmarkDto } from '../../presentation/http/dto/update-bookmark.dto';
import { ListBookmarksDto } from '../../presentation/http/dto/list-bookmarks.dto';
import { normalizeUrl } from '@core/common/url';
import { parseSearchQuery } from './search-query';

const DEFAULT_PAGE_SIZE = 50;
const SCRAPE_BATCH_SIZE = 200;
const MAX_FOLDER_IDS = 50;
const DAY_MS = 86_400_000;

// Only these fields may be searched (prevents arbitrary field injection).
const SEARCHABLE_FIELDS = new Set([
  'title',
  'description',
  'tags',
  'author',
  'comments',
  'content',
  'summary',
  'highlights',
]);
const DEFAULT_SEARCH_FIELDS = [
  'title',
  'description',
  'tags',
  'comments',
  'summary',
  'highlights',
];
const FIELD_ALIAS: Record<string, string> = { notes: 'comments' };
// Fields whose regex target is nested inside sub-documents.
const FIELD_PATHS: Record<string, string[]> = {
  highlights: ['highlights.text', 'highlights.note'],
};

interface SortSpec {
  field: string;
  dir: 1 | -1;
  caseInsensitive?: boolean;
  /** Reads the sort value from a bookmark so it can go into the cursor. */
  value: (b: Bookmark) => unknown;
  isDate?: boolean;
}

const SORTS: Record<string, SortSpec> = {
  newest: {
    field: 'createdAt',
    dir: -1,
    isDate: true,
    value: (b) => b.creationDate,
  },
  oldest: {
    field: 'createdAt',
    dir: 1,
    isDate: true,
    value: (b) => b.creationDate,
  },
  title: {
    field: 'title',
    dir: 1,
    caseInsensitive: true,
    value: (b) => b.title,
  },
  site: { field: 'domain', dir: 1, value: (b) => b.domain },
  opened: {
    field: 'lastOpenedAt',
    dir: -1,
    isDate: true,
    value: (b) => b.lastOpenedAt,
  },
  manual: { field: 'position', dir: 1, value: (b) => b.position },
};

export interface ImportItem {
  bookmarkURL: string;
  title: string;
  folderId: string;
  tags?: string[];
  description?: string;
  comments?: string[];
  isFavorite?: boolean;
  status?: Bookmark['status'];
}

export type ListedBookmark = Bookmark & { snippet?: string };

export interface BookmarkPage {
  items: ListedBookmark[];
  nextCursor: string | null;
}

const toDate = (value: string | null | undefined) =>
  value ? new Date(value) : null;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class BookmarksService {
  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    @Inject('AGENDA') private readonly agenda: Agenda,
    private readonly entitlements: EntitlementsService,
  ) {}

  async createBookmark(userId: string, dto: CreateBookmarkDto) {
    await this.entitlements.assertLimit(
      userId,
      'bookmarks',
      await this.countAll(userId),
    );
    const needsScraping = !dto.title || !dto.description || !dto.logoURL;
    const bookmark = await this.bookmarksRepository.create({
      ...(dto as Partial<Bookmark>),
      // A reminder also keeps the link out of triage until then.
      snoozedUntil: toDate(dto.snoozedUntil ?? dto.revisitAt),
      revisitAt: dto.revisitAt ? new Date(dto.revisitAt) : null,
      userId,
      title: dto.title ?? '',
      description: dto.description ?? '',
      logoURL: dto.logoURL ?? '',
      scrapeStatus: needsScraping ? 'pending' : 'done',
    });

    if (needsScraping) {
      await this.agenda.now('scrape-metadata', {
        bookmarkId: bookmark.id,
        url: bookmark.bookmarkURL,
        userId,
      });
    }
    return bookmark;
  }

  /** Bulk insert used by the importers; skips pages the user already has. */
  async importBookmarks(userId: string, items: ImportItem[]) {
    const known = await this.bookmarksRepository.findExistingUrls(userId);
    const room = await this.entitlements.remaining(
      userId,
      'bookmarks',
      await this.countAll(userId),
    );
    const fresh = items
      .filter((item) => {
        const key = normalizeUrl(item.bookmarkURL);
        if (known.has(key)) return false;
        known.add(key);
        return true;
      })
      // Past the free plan's limit the rest of the file is left out.
      .slice(0, room === Infinity ? undefined : room);

    const created = await this.bookmarksRepository.createMany(
      fresh.map((item) => ({
        ...item,
        userId,
        // Imported bookmarks were curated elsewhere, so they skip the unread queue.
        status: item.status ?? ('done' as const),
        scrapeStatus: 'pending' as const,
      })),
    );

    for (let i = 0; i < created.length; i += SCRAPE_BATCH_SIZE) {
      await this.agenda.now('scrape-batch', {
        userId,
        items: created
          .slice(i, i + SCRAPE_BATCH_SIZE)
          .map((b) => ({ bookmarkId: b.id, url: b.bookmarkURL })),
      });
    }
    return { imported: created.length, skipped: items.length - created.length };
  }

  async listBookmarks(
    userId: string,
    query: ListBookmarksDto,
  ): Promise<BookmarkPage> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const sortName =
      query.triage === 'true' && !query.sort
        ? 'oldest'
        : (query.sort ?? 'newest');
    const sort = SORTS[sortName] ?? SORTS.newest;
    const filter = this.buildFilter(userId, query, sort, sortName);

    const rows = await this.bookmarksRepository.find(filter, {
      limit: limit + 1,
      sort: { [sort.field]: sort.dir, _id: sort.dir },
      caseInsensitive: sort.caseInsensitive,
    });

    const items: ListedBookmark[] = rows.slice(0, limit);
    const last = items[items.length - 1];
    await this.attachSnippets(userId, items, query);
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? this.encodeCursor(last, sort, sortName)
          : null,
    };
  }

  /** Every bookmark of the user (without article content); used by export and public pages. */
  getAll(userId: string, folderId?: string) {
    return this.bookmarksRepository.find({
      userId,
      ...(folderId && { folderId }),
    });
  }

  async getBookmarkById(userId: string, id: string) {
    const bookmark = await this.bookmarksRepository.findOne({
      _id: id,
      userId,
    });
    if (!bookmark)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return bookmark;
  }

  async updateBookmark(userId: string, id: string, dto: UpdateBookmarkDto) {
    const { snoozedUntil, revisitAt, ...rest } = dto;
    const changes: Partial<Bookmark> = { ...(rest as Partial<Bookmark>) };
    if (snoozedUntil !== undefined)
      changes.snoozedUntil = snoozedUntil ? new Date(snoozedUntil) : null;
    if (revisitAt !== undefined) {
      changes.revisitAt = toDate(revisitAt);
      // Setting or clearing a reminder does the same to the triage pause.
      if (snoozedUntil === undefined) changes.snoozedUntil = changes.revisitAt;
    }
    const updated = await this.bookmarksRepository.update(
      { _id: id, userId },
      changes,
    );
    if (!updated)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return updated;
  }

  async deleteBookmark(userId: string, id: string) {
    const deleted = await this.bookmarksRepository.delete({ _id: id, userId });
    if (!deleted)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
  }

  bulkDelete(userId: string, ids: string[]) {
    return this.bookmarksRepository.bulkDelete(userId, ids);
  }

  bulkMove(userId: string, ids: string[], folderId: string) {
    return this.bookmarksRepository.bulkMove(userId, ids, folderId);
  }

  bulkUpdate(
    userId: string,
    ids: string[],
    { addTags, removeTags, ...set }: BulkUpdate['set'] & BulkUpdate,
  ) {
    const clean = Object.fromEntries(
      Object.entries(set).filter(([, v]) => v !== undefined),
    );
    return this.bookmarksRepository.bulkUpdate(userId, ids, {
      set: clean,
      addTags,
      removeTags,
    });
  }

  deleteAll(userId: string) {
    return this.bookmarksRepository.deleteAllByUser(userId);
  }

  getTags(userId: string) {
    return this.bookmarksRepository.getTags(userId);
  }

  async recordOpen(userId: string, id: string) {
    const updated = await this.bookmarksRepository.recordOpen(userId, id);
    if (!updated)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return updated;
  }

  async addHighlight(userId: string, id: string, text: string, note = '') {
    const highlights = await this.bookmarksRepository.addHighlight(userId, id, {
      id: randomUUID(),
      text,
      note,
      createdAt: new Date(),
    });
    if (!highlights)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return { highlights };
  }

  async removeHighlight(userId: string, id: string, highlightId: string) {
    const highlights = await this.bookmarksRepository.removeHighlight(
      userId,
      id,
      highlightId,
    );
    if (!highlights)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return { highlights };
  }

  // ─── Organizing ────────────────────────────────────────────────────────────

  /** Counts for the sidebar badges and the triage entry point. */
  /** Every bookmark the user owns, archived ones included (what plan limits count). */
  countAll(userId: string) {
    return this.bookmarksRepository.count({ userId });
  }

  async getCounts(userId: string) {
    const now = new Date();
    const live = { userId, status: { $ne: 'archived' } };
    const [total, unread, archived, dead, revisit, duplicateGroups] =
      await Promise.all([
        this.bookmarksRepository.count(live),
        this.bookmarksRepository.count({ userId, ...this.triageFilter(now) }),
        this.bookmarksRepository.count({ userId, status: 'archived' }),
        this.bookmarksRepository.count({ ...live, isDeadLink: true }),
        this.bookmarksRepository.count({ ...live, revisitAt: { $lte: now } }),
        this.bookmarksRepository.findDuplicateGroups(userId, 200),
      ]);
    return {
      total,
      unread,
      archived,
      dead,
      revisit,
      duplicates: duplicateGroups.length,
    };
  }

  async findDuplicate(userId: string, url: string) {
    const existing = await this.bookmarksRepository.findByNormalizedUrl(
      userId,
      url,
    );
    return existing
      ? {
          exists: true,
          bookmark: {
            id: existing.id,
            title: existing.title,
            folderId: existing.folderId,
            status: existing.status,
          },
        }
      : { exists: false };
  }

  getDuplicateGroups(userId: string) {
    return this.bookmarksRepository.findDuplicateGroups(userId, 100);
  }

  /** Folds duplicates into one bookmark, keeping everything worth keeping. */
  async mergeBookmarks(userId: string, keepId: string, mergeIds: string[]) {
    const ids = [...new Set(mergeIds)].filter((id) => id !== keepId);
    if (ids.length === 0) throw new BadRequestException('Nothing to merge');

    const [keep, others] = await Promise.all([
      this.bookmarksRepository.findOne({ _id: keepId, userId }),
      this.bookmarksRepository.find({ userId, _id: { $in: ids } }),
    ]);
    if (!keep || others.length !== ids.length)
      throw new NotFoundException('Bookmark not found');

    const everything = [keep, ...others];
    const union = <T>(pick: (b: Bookmark) => T[]) => [
      ...new Set(everything.flatMap(pick)),
    ];
    const seen = new Set<string>();
    const highlights = everything
      .flatMap((b) => b.highlights)
      .filter((h) => !seen.has(h.text) && !!seen.add(h.text));

    const merged = await this.bookmarksRepository.update(
      { _id: keepId, userId },
      {
        tags: union((b) => b.tags),
        comments: union((b) => b.comments),
        highlights,
        isFavorite: everything.some((b) => b.isFavorite),
        pinned: everything.some((b) => b.pinned),
        openCount: everything.reduce((sum, b) => sum + b.openCount, 0),
      },
    );
    await this.bookmarksRepository.bulkDelete(userId, ids);
    return merged;
  }

  // ─── Query building ────────────────────────────────────────────────────────

  /** Unread and not currently snoozed: the triage queue. */
  private triageFilter(now: Date) {
    return {
      status: 'unread',
      $or: [{ snoozedUntil: null }, { snoozedUntil: { $lte: now } }],
    };
  }

  private buildFilter(
    userId: string,
    query: ListBookmarksDto,
    sort: SortSpec,
    sortName: string,
    now = new Date(),
  ): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];
    const { folderId, q, fields, tag, cursor } = query;
    const parsed = parseSearchQuery(q ?? '');

    if (folderId === 'favorites') {
      and.push({ isFavorite: true });
    } else if (folderId && folderId !== 'root') {
      const ids = folderId.split(',').filter(Boolean).slice(0, MAX_FOLDER_IDS);
      and.push({ folderId: ids.length > 1 ? { $in: ids } : ids[0] });
    }

    // Archived bookmarks stay out of every view unless asked for.
    if (parsed.statuses.length > 0) {
      const statuses = parsed.statuses.map((s) => ({ status: s }));
      // Bookmarks saved before read status existed count as done.
      if (parsed.statuses.includes('done'))
        statuses.push({ status: { $exists: false } } as never);
      and.push({ $or: statuses });
    } else {
      and.push({ status: { $ne: 'archived' } });
    }
    if (query.triage === 'true') and.push(this.triageFilter(now));

    if (query.pinned === 'true') and.push({ pinned: true });
    if (query.pinned === 'false') and.push({ pinned: { $ne: true } });

    const tagMatch = (t: string) => ({
      $or: [{ tags: t }, { tags: { $regex: `^${escapeRegex(t)}/` } }],
    });
    for (const t of [tag, ...parsed.tags]) if (t) and.push(tagMatch(t));
    for (const t of parsed.notTags)
      and.push({ tags: { $not: new RegExp(`^${escapeRegex(t)}(/|$)`) } });

    for (const site of parsed.sites)
      and.push({
        domain: { $regex: `(^|\\.)${escapeRegex(site)}$` },
      });

    if (parsed.flags.has('fav')) and.push({ isFavorite: true });
    if (parsed.flags.has('pinned')) and.push({ pinned: true });
    if (parsed.flags.has('dead')) and.push({ isDeadLink: true });
    if (parsed.flags.has('article')) and.push({ isArticle: true });
    if (parsed.flags.has('revisit')) and.push({ revisitAt: { $ne: null } });
    if (parsed.flags.has('due')) and.push({ revisitAt: { $lte: now } });

    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
    if (parsed.savedWithinDays !== undefined)
      and.push({ createdAt: { $gte: ago(parsed.savedWithinDays) } });
    if (parsed.olderThanDays !== undefined)
      and.push({ createdAt: { $lt: ago(parsed.olderThanDays) } });
    if (parsed.openedWithinDays !== undefined)
      and.push({
        openCount: { $gt: 0 },
        lastOpenedAt: { $gte: ago(parsed.openedWithinDays) },
      });
    if (parsed.staleDays !== undefined)
      and.push({ lastOpenedAt: { $lt: ago(parsed.staleDays) } });

    if (parsed.text) and.push(this.textFilter(parsed.text, fields));

    if (cursor) and.push(this.cursorFilter(cursor, sort, sortName));

    return { userId, $and: and };
  }

  private textFilter(term: string, fields?: string) {
    const pattern = { $regex: escapeRegex(term), $options: 'i' };
    const requested = fields
      ?.split(',')
      .map((f) => FIELD_ALIAS[f] ?? f)
      .filter((f) => SEARCHABLE_FIELDS.has(f));
    const searchFields = requested?.length ? requested : DEFAULT_SEARCH_FIELDS;
    const paths = searchFields.flatMap((f) => FIELD_PATHS[f] ?? [f]);
    return {
      $or: [...paths, 'bookmarkURL'].map((field) => ({ [field]: pattern })),
    };
  }

  /** A short excerpt around the match, for results found through article text. */
  private async attachSnippets(
    userId: string,
    items: ListedBookmark[],
    query: ListBookmarksDto,
  ) {
    const term = parseSearchQuery(query.q ?? '').text;
    if (!term || !query.fields?.split(',').includes('content')) return;
    const withContent = await this.bookmarksRepository.find(
      { userId, _id: { $in: items.map((b) => b.id) } },
      { includeContent: true },
    );
    const byId = new Map(withContent.map((b) => [b.id, b.content ?? '']));
    const needle = term.toLowerCase();
    for (const item of items) {
      const text = (byId.get(item.id) ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
      const at = text.toLowerCase().indexOf(needle);
      if (at === -1) continue;
      const start = Math.max(0, at - 70);
      const end = Math.min(text.length, at + term.length + 110);
      item.snippet = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
    }
  }

  // ─── Cursors ───────────────────────────────────────────────────────────────

  private encodeCursor(b: Bookmark, sort: SortSpec, sortName: string): string {
    const raw = sort.value(b);
    const value = raw instanceof Date ? raw.toISOString() : raw;
    return Buffer.from(JSON.stringify([sortName, value, b.id])).toString(
      'base64url',
    );
  }

  private cursorFilter(cursor: string, sort: SortSpec, sortName: string) {
    try {
      const [name, rawValue, id] = JSON.parse(
        Buffer.from(cursor, 'base64url').toString(),
      );
      if (name !== sortName || typeof id !== 'string') throw new Error();
      const value = sort.isDate ? new Date(rawValue) : rawValue;
      if (value instanceof Date && Number.isNaN(value.getTime()))
        throw new Error();
      const op = sort.dir === -1 ? '$lt' : '$gt';
      return {
        $or: [
          { [sort.field]: { [op]: value } },
          { [sort.field]: value, _id: { [op]: id } },
        ],
      };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
