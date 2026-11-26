import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bookmark } from '@content/bookmarks/infrastructure/persistence/bookmark.schema';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { EntitlementsService } from '@identity/billing/entitlements.service';
import { OAuthGrant, OrganizeSession, Proposal } from './schemas';
import {
  PAGE_SIZE,
  SESSION_TTL_MS,
  cleanFolderPath,
  cleanTags,
  matchFolderPath,
  pathKey,
  safeUrl,
  sameTags,
} from './rules';

type Session = OrganizeSession & { _id: string };

export interface ProposedChange {
  id: string;
  title?: string;
  tags?: string[];
  description?: string;
  folder?: string;
  reason?: string;
}

@Injectable()
export class OrganizeService {
  constructor(
    @InjectModel(OrganizeSession.name)
    private readonly sessions: Model<OrganizeSession>,
    @InjectModel(Proposal.name) private readonly proposals: Model<Proposal>,
    @InjectModel(OAuthGrant.name) private readonly grants: Model<OAuthGrant>,
    @InjectModel(Bookmark.name) private readonly bookmarks: Model<Bookmark>,
    private readonly bookmarksService: BookmarksService,
    private readonly folders: FoldersService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /** Starts a new run. Any earlier one that was still open loses its access. */
  async start(userId: string, includeNotes: boolean) {
    await this.entitlements.assertFeature(userId, 'ai');
    const open = await this.sessions.find({ userId, status: 'open' }).lean();
    for (const s of open) await this.end(userId, String(s._id));
    const session = await this.sessions.create({
      userId,
      includeNotes,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return this.describe(session.toObject() as Session);
  }

  /** Ends Claude's access. Suggestions already made stay for review. */
  async end(userId: string, sessionId: string) {
    const session = await this.owned(userId, sessionId);
    await this.grants.deleteMany({ sessionId: session._id });
    const pending = await this.proposals.countDocuments({
      sessionId: session._id,
      status: 'pending',
    });
    const status = pending > 0 ? 'review' : 'done';
    await this.sessions.updateOne({ _id: session._id }, { $set: { status } });
    return this.describe({ ...session, status });
  }

  /** The newest run, if any. */
  async current(userId: string) {
    const session = await this.sessions
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .lean<Session>();
    if (!session) return null;
    return this.describe(await this.expire(session));
  }

  /** The run a new connection would attach to. */
  async openSession(userId: string): Promise<Session | null> {
    return this.sessions
      .findOne({ userId, status: 'open', expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean<Session>();
  }

  private async expire(session: Session): Promise<Session> {
    if (session.status !== 'open' || session.expiresAt > new Date())
      return session;
    await this.end(session.userId, session._id);
    return (await this.owned(session.userId, session._id)) as Session;
  }

  private async owned(userId: string, sessionId: string): Promise<Session> {
    const session = await this.sessions
      .findOne({ _id: sessionId, userId })
      .lean<Session>();
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async describe(s: Session) {
    const counts = await this.proposals.aggregate<{ _id: string; n: number }>([
      { $match: { sessionId: s._id } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const n = (k: string) => counts.find((c) => c._id === k)?.n ?? 0;
    return {
      id: s._id,
      status: s.status,
      expiresAt: s.expiresAt,
      includeNotes: s.includeNotes,
      connected: !!s.connectedAt,
      structure: s.structure ?? [],
      summary: s.summary ?? '',
      counts: {
        pending: n('pending'),
        applied: n('applied'),
        rejected: n('rejected'),
      },
    };
  }

  // ─── What Claude can do ───────────────────────────────────────────────────

  /** The session behind a token, only while access is allowed. */
  async activeSession(sessionId: string): Promise<Session | null> {
    return this.sessions
      .findOne({
        _id: sessionId,
        status: 'open',
        expiresAt: { $gt: new Date() },
      })
      .lean<Session>();
  }

  /** Folders Claude may see: locked and hidden ones, and everything inside them, are left out. */
  private async visibleFolders(userId: string) {
    const all = await this.folders.getAllFolders(userId);
    const byId = new Map(all.map((f) => [f.id, f]));
    const paths = new Map<string, string>();
    for (const folder of all) {
      const names: string[] = [];
      let hidden = false;
      const seen = new Set<string>();
      for (
        let cur: (typeof all)[number] | undefined = folder;
        cur && !seen.has(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      ) {
        seen.add(cur.id);
        hidden ||= !!cur.isHidden || !!cur.isLocked;
        names.unshift(cur.name);
      }
      if (!hidden) paths.set(folder.id, names.join('/'));
    }
    return paths;
  }

  async overview(session: Session) {
    const paths = await this.visibleFolders(session.userId);
    const match = {
      userId: session.userId,
      folderId: { $in: [...paths.keys()] },
    };
    const [total, perFolder, tags, proposed] = await Promise.all([
      this.bookmarks.countDocuments(match),
      this.bookmarks.aggregate<{ _id: string; n: number }>([
        { $match: match },
        { $group: { _id: '$folderId', n: { $sum: 1 } } },
      ]),
      this.bookmarks.aggregate<{ _id: string; n: number }>([
        { $match: match },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 300 },
      ]),
      this.proposals.countDocuments({ sessionId: session._id }),
    ]);
    const count = new Map(perFolder.map((f) => [f._id, f.n]));
    return {
      totalBookmarks: total,
      alreadyProposed: proposed,
      folders: [...paths].map(([id, path]) => ({
        path,
        bookmarks: count.get(id) ?? 0,
      })),
      tags: tags.map((t) => ({ tag: t._id, count: t.n })),
      proposedStructure: session.structure ?? [],
    };
  }

  async listForClaude(
    session: Session,
    options: { cursor?: string; limit?: number; remainingOnly?: boolean },
  ) {
    const paths = await this.visibleFolders(session.userId);
    const limit = Math.min(Math.max(options.limit ?? PAGE_SIZE, 1), PAGE_SIZE);
    const id: Record<string, unknown> = {};
    if (options.cursor) id.$gt = options.cursor;
    if (options.remainingOnly)
      id.$nin = await this.proposals.distinct('bookmarkId', {
        sessionId: session._id,
      });
    const rows = await this.bookmarks
      .find({
        userId: session.userId,
        folderId: { $in: [...paths.keys()] },
        ...(Object.keys(id).length && { _id: id }),
      })
      .sort({ _id: 1 })
      .limit(limit + 1)
      .select(
        'title bookmarkURL description summary tags folderId comments highlights',
      )
      .lean<any[]>();
    const page = rows.slice(0, limit);
    return {
      bookmarks: page.map((b) => ({
        id: b._id,
        title: (b.title ?? '').slice(0, 300),
        url: safeUrl(b.bookmarkURL),
        folder: paths.get(b.folderId),
        tags: b.tags ?? [],
        description: (b.description || b.summary || '').slice(0, 600),
        ...(session.includeNotes && {
          notes: [
            ...(b.comments ?? []),
            ...(b.highlights ?? []).map((h: any) =>
              [h.text, h.note].filter(Boolean).join(' - '),
            ),
          ]
            .slice(0, 5)
            .map((n: string) => String(n).slice(0, 300)),
        }),
      })),
      nextCursor: rows.length > limit ? page[page.length - 1]._id : null,
    };
  }

  async saveStructure(session: Session, folders: string[]) {
    const structure = [
      ...new Set(folders.map(cleanFolderPath).filter((p): p is string => !!p)),
    ].slice(0, 100);
    await this.sessions.updateOne(
      { _id: session._id },
      { $set: { structure } },
    );
    return { saved: structure };
  }

  /** Records suggestions. This never touches the bookmarks themselves. */
  async propose(session: Session, changes: ProposedChange[]) {
    const paths = await this.visibleFolders(session.userId);
    const rows = await this.bookmarks
      .find({
        _id: { $in: changes.map((c) => c.id) },
        userId: session.userId,
        folderId: { $in: [...paths.keys()] },
      })
      .select('title tags description folderId')
      .lean<any[]>();
    const known = new Map(rows.map((b) => [b._id, b]));
    const existingPaths = new Map(
      [...paths.values()].map((p) => [pathKey(p), p]),
    );
    let saved = 0;
    const skipped: { id: string; why: string }[] = [];

    for (const change of changes) {
      const bookmark = known.get(change.id);
      if (!bookmark) {
        skipped.push({ id: change.id, why: 'unknown bookmark' });
        continue;
      }
      const set: Record<string, unknown> = {};
      const title = change.title?.trim().replace(/\s+/g, ' ').slice(0, 300);
      if (title && title !== (bookmark.title ?? '')) set.title = title;
      if (change.tags) {
        const tags = cleanTags(change.tags);
        if (tags.length && !sameTags(tags, bookmark.tags ?? []))
          set.tags = tags;
      }
      const description = change.description?.trim().slice(0, 500);
      if (description && description !== (bookmark.description ?? ''))
        set.description = description;
      const folder = change.folder
        ? (existingPaths.get(pathKey(change.folder)) ??
          cleanFolderPath(change.folder))
        : null;
      if (
        folder &&
        pathKey(folder) !== pathKey(paths.get(bookmark.folderId) ?? '')
      )
        set.folderPath = folder;
      if (Object.keys(set).length === 0) {
        skipped.push({ id: change.id, why: 'nothing would change' });
        continue;
      }
      // Proposing again for the same bookmark replaces the earlier suggestion.
      const unset = Object.fromEntries(
        ['title', 'tags', 'description', 'folderPath']
          .filter((k) => !(k in set))
          .map((k) => [k, '']),
      );
      await this.proposals.updateOne(
        { sessionId: session._id, bookmarkId: change.id },
        {
          $set: {
            ...set,
            userId: session.userId,
            reason: (change.reason ?? '').slice(0, 300),
            status: 'pending',
          },
          ...(Object.keys(unset).length && { $unset: unset }),
        },
        { upsert: true },
      );
      saved++;
    }
    return { saved, skipped };
  }

  async finish(session: Session, summary: string) {
    await this.sessions.updateOne(
      { _id: session._id },
      { $set: { summary: summary.slice(0, 2000) } },
    );
    return this.end(session.userId, session._id);
  }

  // ─── Review ───────────────────────────────────────────────────────────────

  async listProposals(userId: string, sessionId: string) {
    await this.owned(userId, sessionId);
    const proposals = await this.proposals
      .find({ sessionId, userId })
      .sort({ createdAt: 1 })
      .limit(5000)
      .lean<any[]>();
    const rows = await this.bookmarks
      .find({ _id: { $in: proposals.map((p) => p.bookmarkId) }, userId })
      .select('title bookmarkURL tags description folderId')
      .lean<any[]>();
    const byId = new Map(rows.map((b) => [b._id, b]));
    const paths = await this.visibleFolders(userId);
    return proposals.flatMap((p) => {
      const b = byId.get(p.bookmarkId);
      if (!b) return []; // deleted since
      return [
        {
          id: p._id,
          status: p.status,
          reason: p.reason,
          bookmark: {
            id: b._id,
            title: b.title,
            url: b.bookmarkURL,
            tags: b.tags ?? [],
            description: b.description ?? '',
            folder: paths.get(b.folderId) ?? '',
          },
          title: p.title ?? null,
          tags: p.tags ?? null,
          description: p.description ?? null,
          folder: p.folderPath ?? null,
        },
      ];
    });
  }

  /** Visible folders by comparable path. */
  private async folderKeys(userId: string) {
    return new Map(
      [...(await this.visibleFolders(userId))].map(([id, path]) => [
        pathKey(path),
        id,
      ]),
    );
  }

  /** Finds a folder by path among the visible ones, creating the missing levels. */
  private async folderResolver(userId: string) {
    const known = await this.folderKeys(userId);
    return async (path: string) => {
      const match = matchFolderPath(path, known);
      let parentId = match.parentId;
      let key = path
        .split('/')
        .slice(0, path.split('/').length - match.missing.length)
        .join('/');
      for (const name of match.missing) {
        parentId = (await this.folders.createFolder(userId, { name, parentId }))
          .id;
        key = key ? `${key}/${name}` : name;
        known.set(pathKey(key), parentId);
      }
      return parentId!;
    };
  }

  async apply(userId: string, sessionId: string, ids: string[]) {
    await this.owned(userId, sessionId);
    const chosen = await this.proposals
      .find({ sessionId, userId, _id: { $in: ids }, status: 'pending' })
      .lean<any[]>();
    const folderFor = await this.folderResolver(userId);
    let applied = 0;
    for (const p of chosen) {
      const bookmark = await this.bookmarks
        .findOne({ _id: p.bookmarkId, userId })
        .select('title tags description folderId')
        .lean<any>();
      if (!bookmark) continue;
      const changes: Record<string, unknown> = {};
      if (p.title) changes.title = p.title;
      if (p.tags) changes.tags = p.tags;
      if (p.description) changes.description = p.description;
      if (p.folderPath) changes.folderId = await folderFor(p.folderPath);
      // Remember the old values first, so a failure can never lose them.
      await this.proposals.updateOne(
        { _id: p._id },
        {
          $set: {
            before: {
              title: bookmark.title ?? '',
              tags: bookmark.tags ?? [],
              description: bookmark.description ?? '',
              folderId: bookmark.folderId,
            },
          },
        },
      );
      await this.bookmarksService.updateBookmark(userId, p.bookmarkId, changes);
      await this.proposals.updateOne(
        { _id: p._id },
        { $set: { status: 'applied' } },
      );
      applied++;
    }
    await this.settle(sessionId);
    return { applied };
  }

  async reject(userId: string, sessionId: string, ids: string[]) {
    await this.owned(userId, sessionId);
    const result = await this.proposals.updateMany(
      { sessionId, userId, _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'rejected' } },
    );
    await this.settle(sessionId);
    return { rejected: result.modifiedCount };
  }

  /** Puts applied changes back the way they were. */
  async undo(userId: string, sessionId: string) {
    await this.owned(userId, sessionId);
    const applied = await this.proposals
      .find({ sessionId, userId, status: 'applied' })
      .lean<any[]>();
    if (applied.length === 0)
      throw new BadRequestException('There is nothing to undo.');
    const existing = new Set(
      (await this.folders.getAllFolders(userId)).map((f) => f.id),
    );
    let undone = 0;
    for (const p of applied) {
      if (!p.before) continue;
      const changes: Record<string, unknown> = {};
      if (p.title) changes.title = p.before.title;
      if (p.tags) changes.tags = p.before.tags;
      if (p.description) changes.description = p.before.description;
      // A folder deleted since then cannot be restored to.
      if (p.folderPath && existing.has(p.before.folderId))
        changes.folderId = p.before.folderId;
      const found = await this.bookmarks.exists({ _id: p.bookmarkId, userId });
      if (found) {
        await this.bookmarksService.updateBookmark(
          userId,
          p.bookmarkId,
          changes,
        );
        undone++;
      }
      await this.proposals.updateOne(
        { _id: p._id },
        { $set: { status: 'pending', before: null } },
      );
    }
    await this.settle(sessionId);
    return { undone };
  }

  /** A closed run is "done" once nothing is waiting for a decision. */
  private async settle(sessionId: string) {
    const pending = await this.proposals.countDocuments({
      sessionId,
      status: 'pending',
    });
    await this.sessions.updateOne(
      { _id: sessionId, status: { $ne: 'open' } },
      { $set: { status: pending ? 'review' : 'done' } },
    );
  }
}
