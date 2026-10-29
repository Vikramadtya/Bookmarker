import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Agenda } from 'agenda';
import { IBookmarkRepository } from '../../domain/repositories/bookmark.repository.interface';
import { Bookmark } from '../../domain/entities/bookmark.entity';
import { CreateBookmarkDto } from '../../presentation/http/dto/create-bookmark.dto';
import { UpdateBookmarkDto } from '../../presentation/http/dto/update-bookmark.dto';
import { ListBookmarksDto } from '../../presentation/http/dto/list-bookmarks.dto';

const DEFAULT_PAGE_SIZE = 50;
const SCRAPE_BATCH_SIZE = 200;
const MAX_FOLDER_IDS = 50;

// Only these fields may be searched (prevents arbitrary field injection).
const SEARCHABLE_FIELDS = new Set([
  'title',
  'description',
  'tags',
  'author',
  'comments',
  'content',
]);
const DEFAULT_SEARCH_FIELDS = ['title', 'description', 'tags', 'comments'];
const FIELD_ALIAS: Record<string, string> = { notes: 'comments' };

export interface ImportItem {
  bookmarkURL: string;
  title: string;
  folderId: string;
}

export interface BookmarkPage {
  items: Bookmark[];
  nextCursor: string | null;
}

@Injectable()
export class BookmarksService {
  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  async createBookmark(userId: string, dto: CreateBookmarkDto) {
    const needsScraping = !dto.title || !dto.description || !dto.logoURL;
    const bookmark = await this.bookmarksRepository.create({
      ...dto,
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

  /** Bulk insert used by the importer; skips URLs the user already has. */
  async importBookmarks(userId: string, items: ImportItem[]) {
    const known = await this.bookmarksRepository.findExistingUrls(userId);
    const fresh = items.filter((item) => {
      if (known.has(item.bookmarkURL)) return false;
      known.add(item.bookmarkURL);
      return true;
    });

    const created = await this.bookmarksRepository.createMany(
      fresh.map((item) => ({
        ...item,
        userId,
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
    const filter = this.buildFilter(userId, query);
    const rows = await this.bookmarksRepository.find(filter, {
      limit: limit + 1,
    });

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? this.encodeCursor(last) : null,
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
    const updated = await this.bookmarksRepository.update(
      { _id: id, userId },
      dto,
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

  deleteAll(userId: string) {
    return this.bookmarksRepository.deleteAllByUser(userId);
  }

  getTags(userId: string) {
    return this.bookmarksRepository.getTags(userId);
  }

  // ─── Query building ────────────────────────────────────────────────────────

  private buildFilter(
    userId: string,
    query: ListBookmarksDto,
  ): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];
    const { folderId, q, fields, tag, cursor } = query;

    if (folderId === 'favorites') {
      and.push({ isFavorite: true });
    } else if (folderId && folderId !== 'root') {
      const ids = folderId.split(',').filter(Boolean).slice(0, MAX_FOLDER_IDS);
      and.push({ folderId: ids.length > 1 ? { $in: ids } : ids[0] });
    }

    if (tag) and.push({ tags: tag });

    const term = q?.trim();
    if (term) {
      const pattern = {
        $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
      const requested = fields
        ?.split(',')
        .map((f) => FIELD_ALIAS[f] ?? f)
        .filter((f) => SEARCHABLE_FIELDS.has(f));
      const searchFields = requested?.length
        ? requested
        : DEFAULT_SEARCH_FIELDS;
      and.push({
        $or: [...searchFields, 'bookmarkURL'].map((field) => ({
          [field]: pattern,
        })),
      });
    }

    if (cursor) {
      const [createdAt, id] = this.decodeCursor(cursor);
      and.push({
        $or: [
          { createdAt: { $lt: createdAt } },
          { createdAt, _id: { $lt: id } },
        ],
      });
    }

    return and.length > 0 ? { userId, $and: and } : { userId };
  }

  private encodeCursor(b: Bookmark): string {
    return Buffer.from(
      JSON.stringify([new Date(b.creationDate).toISOString(), b.id]),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): [Date, string] {
    try {
      const [iso, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      const date = new Date(iso);
      if (Number.isNaN(date.getTime()) || typeof id !== 'string')
        throw new Error();
      return [date, id];
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
