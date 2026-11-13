import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Bookmark as BookmarkSchema,
  BookmarkDocument,
} from './bookmark.schema';
import {
  BulkUpdate,
  DomainAffinity,
  Filter,
  FindOptions,
  IBookmarkRepository,
  ScrapeResult,
} from '../../domain/repositories/bookmark.repository.interface';
import { Bookmark, Highlight } from '../../domain/entities/bookmark.entity';
import { domainOf, normalizeUrl } from '@core/common/url';
import { BookmarkMapper } from './bookmark.mapper';

const SORT_NEWEST = { createdAt: -1, _id: -1 } as const;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Keep the existing value unless it is null/empty, then use the scraped one. */
const fillIfEmpty = (field: string, value: string | undefined) =>
  value === undefined || value === ''
    ? `$${field}`
    : {
        $cond: [
          { $in: [{ $ifNull: [`$${field}`, ''] }, ['']] },
          { $literal: value },
          `$${field}`,
        ],
      };

@Injectable()
export class BookmarksMongooseRepository
  implements IBookmarkRepository, OnModuleInit
{
  private readonly logger = new Logger(BookmarksMongooseRepository.name);

  constructor(
    @InjectModel(BookmarkSchema.name) private model: Model<BookmarkDocument>,
  ) {}

  onModuleInit() {
    // Runs in the background so a large library never delays startup.
    void this.backfillAll();
  }

  private async backfillAll() {
    try {
      let total = 0;
      for (let n = await this.backfillDerived(500); n > 0;) {
        total += n;
        n = await this.backfillDerived(500);
      }
      if (total)
        this.logger.log(`Backfilled derived fields on ${total} bookmarks`);
    } catch (error) {
      this.logger.warn(`Backfill failed: ${(error as Error).message}`);
    }
  }

  async create(data: Partial<Bookmark>): Promise<Bookmark> {
    const created = await this.model.create(this.withDefaults(data) as any);
    return BookmarkMapper.toDomain((created as any).toObject());
  }

  async createMany(data: Partial<Bookmark>[]): Promise<Bookmark[]> {
    if (data.length === 0) return [];
    const created = await this.model.insertMany(
      data.map((d, i) => this.withDefaults(d, i)) as any[],
    );
    return created.map((doc: any) => BookmarkMapper.toDomain(doc.toObject()));
  }

  async findOne(filter: Filter): Promise<Bookmark | null> {
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? BookmarkMapper.toDomain(doc) : null;
  }

  async find(filter: Filter, options?: FindOptions): Promise<Bookmark[]> {
    let query = this.model
      .find(filter)
      .sort(options?.sort ?? SORT_NEWEST) as any;
    if (options?.caseInsensitive)
      query = query.collation({ locale: 'en', strength: 2 });
    if (!options?.includeContent) query = query.select('-content');
    if (options?.limit) query = query.limit(options.limit);
    return BookmarkMapper.toDomainList(await query.lean().exec());
  }

  count(filter: Filter): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async update(
    filter: Filter,
    data: Partial<Bookmark>,
  ): Promise<Bookmark | null> {
    const updated = await this.model
      .findOneAndUpdate(
        filter,
        { $set: this.toDoc(data) },
        { returnDocument: 'after' },
      )
      .select('-content')
      .lean()
      .exec();
    return updated ? BookmarkMapper.toDomain(updated) : null;
  }

  async delete(filter: Filter): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  async bulkDelete(userId: string, ids: string[]): Promise<void> {
    await this.model.deleteMany({ _id: { $in: ids }, userId }).exec();
  }

  async bulkMove(
    userId: string,
    ids: string[],
    folderId: string,
  ): Promise<void> {
    await this.model
      .updateMany({ _id: { $in: ids }, userId }, { $set: { folderId } })
      .exec();
  }

  async deleteByFolderIds(userId: string, folderIds: string[]): Promise<void> {
    await this.model
      .deleteMany({ folderId: { $in: folderIds }, userId })
      .exec();
  }

  async moveByFolderIds(
    userId: string,
    folderIds: string[],
    targetFolderId: string,
  ): Promise<void> {
    await this.model
      .updateMany(
        { folderId: { $in: folderIds }, userId },
        { $set: { folderId: targetFolderId } },
      )
      .exec();
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.model.deleteMany({ userId }).exec();
  }

  async tagCounts(userId: string) {
    const rows = await this.model
      .aggregate([
        { $match: { userId, status: { $ne: 'archived' } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({
      tag: r._id as string,
      count: r.count as number,
    }));
  }

  async renameTag(userId: string, from: string, to: string): Promise<number> {
    const prefix = new RegExp(`^${escapeRegex(from)}(/|$)`);
    const docs = await this.model
      .find({ userId, tags: prefix })
      .select('_id tags')
      .lean()
      .exec();
    if (docs.length === 0) return 0;
    await this.model.bulkWrite(
      docs.map((doc: any) => {
        const tags = [
          ...new Set<string>(
            doc.tags.map((t: string) =>
              prefix.test(t) ? to + t.slice(from.length) : t,
            ),
          ),
        ];
        return {
          updateOne: { filter: { _id: doc._id }, update: { $set: { tags } } },
        };
      }),
    );
    return docs.length;
  }

  async removeTag(userId: string, tag: string): Promise<number> {
    const result = await this.model
      .updateMany({ userId, tags: tag }, { $pull: { tags: tag } })
      .exec();
    return result.modifiedCount;
  }

  async bulkUpdate(
    userId: string,
    ids: string[],
    { set, addTags, removeTags }: BulkUpdate,
  ): Promise<void> {
    const filter = { _id: { $in: ids }, userId };
    if (set && Object.keys(set).length > 0)
      await this.model.updateMany(filter, { $set: this.toDoc(set) }).exec();
    // Two steps: Mongo rejects $addToSet and $pull on the same field in one update.
    if (addTags?.length)
      await this.model
        .updateMany(filter, { $addToSet: { tags: { $each: addTags } } })
        .exec();
    if (removeTags?.length)
      await this.model
        .updateMany(filter, { $pull: { tags: { $in: removeTags } } })
        .exec();
  }

  async recordOpen(userId: string, id: string): Promise<Bookmark | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        [
          {
            $set: {
              openCount: { $add: [{ $ifNull: ['$openCount', 0] }, 1] },
              lastOpenedAt: '$$NOW',
              // Looking at it is the revisit.
              revisitAt: null,
              // Opening something you have not read yet means you are reading it.
              status: {
                $cond: [{ $eq: ['$status', 'unread'] }, 'reading', '$status'],
              },
            },
          },
        ],
        { returnDocument: 'after', updatePipeline: true },
      )
      .select('-content')
      .lean()
      .exec();
    return doc ? BookmarkMapper.toDomain(doc) : null;
  }

  async addHighlight(userId: string, id: string, highlight: Highlight) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        { $push: { highlights: highlight } },
        { returnDocument: 'after' },
      )
      .select('highlights createdAt')
      .lean()
      .exec();
    return doc ? BookmarkMapper.toDomain(doc).highlights : null;
  }

  async removeHighlight(userId: string, id: string, highlightId: string) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        { $pull: { highlights: { id: highlightId } } },
        { returnDocument: 'after' },
      )
      .select('highlights createdAt')
      .lean()
      .exec();
    return doc ? BookmarkMapper.toDomain(doc).highlights : null;
  }

  async findByNormalizedUrl(userId: string, url: string) {
    const doc = await this.model
      .findOne({ userId, normalizedUrl: normalizeUrl(url) })
      .select('-content')
      .lean()
      .exec();
    return doc ? BookmarkMapper.toDomain(doc) : null;
  }

  async findDuplicateGroups(userId: string, limit: number) {
    const groups = await this.model
      .aggregate([
        { $match: { userId, normalizedUrl: { $nin: [null, ''] } } },
        { $group: { _id: '$normalizedUrl', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: limit },
      ])
      .exec();
    if (groups.length === 0) return [];
    const docs = await this.model
      .find({ userId, normalizedUrl: { $in: groups.map((g) => g._id) } })
      .select('-content')
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    const byUrl = new Map<string, Bookmark[]>();
    for (const doc of docs) {
      const list = byUrl.get(doc.normalizedUrl) ?? [];
      list.push(BookmarkMapper.toDomain(doc));
      byUrl.set(doc.normalizedUrl, list);
    }
    return [...byUrl.values()];
  }

  async domainAffinity(
    userId: string,
    domain: string,
  ): Promise<DomainAffinity> {
    if (!domain) return { folders: [], tags: [] };
    const [folders, tags] = await Promise.all([
      this.model
        .aggregate([
          { $match: { userId, domain } },
          { $group: { _id: '$folderId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 },
        ])
        .exec(),
      this.model
        .aggregate([
          { $match: { userId, domain } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .exec(),
    ]);
    return {
      folders: folders.map((f) => ({ folderId: f._id, count: f.count })),
      tags: tags.map((t) => ({ tag: t._id, count: t.count })),
    };
  }

  async backfillDerived(batch: number): Promise<number> {
    const docs = await this.model
      .find({
        $or: [
          { normalizedUrl: { $exists: false } },
          { position: { $exists: false } },
        ],
      })
      .select('_id bookmarkURL createdAt')
      .limit(batch)
      .lean()
      .exec();
    if (docs.length === 0) return 0;
    await this.model.bulkWrite(
      docs.map((d: any) => ({
        updateOne: {
          filter: { _id: d._id },
          update: {
            $set: {
              normalizedUrl: normalizeUrl(d.bookmarkURL),
              domain: domainOf(d.bookmarkURL),
              position: -new Date(d.createdAt).getTime(),
              lastOpenedAt: d.createdAt,
            },
          },
        },
      })),
    );
    return docs.length;
  }

  async getTags(userId: string): Promise<string[]> {
    const tags = await this.model.distinct('tags', { userId }).exec();
    return (tags as string[]).sort((a, b) => a.localeCompare(b));
  }

  /** Normalized URLs, so imports skip pages that differ only by tracking noise. */
  async findExistingUrls(userId: string): Promise<Set<string>> {
    return new Set(
      await this.model.distinct('normalizedUrl', { userId }).exec(),
    );
  }

  async applyScrapeResult(
    id: string,
    result: ScrapeResult,
  ): Promise<Bookmark | null> {
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        [
          {
            $set: {
              title: fillIfEmpty('title', result.title),
              description: fillIfEmpty('description', result.description),
              logoURL: fillIfEmpty('logoURL', result.logoURL),
              imageURL: fillIfEmpty('imageURL', result.imageURL),
              summary: fillIfEmpty('summary', result.summary),
              suggestedTags: result.suggestedTags
                ? { $literal: result.suggestedTags }
                : '$suggestedTags',
              suggestedFolderId:
                result.suggestedFolderId === undefined
                  ? '$suggestedFolderId'
                  : { $literal: result.suggestedFolderId },
              content: result.content
                ? { $literal: result.content }
                : '$content',
              isArticle: result.isArticle ?? '$isArticle',
              scrapeStatus: result.scrapeStatus,
            },
          },
        ],
        { returnDocument: 'after', updatePipeline: true },
      )
      .select('-content')
      .lean()
      .exec();
    return updated ? BookmarkMapper.toDomain(updated) : null;
  }

  async findStaleLinks(
    checkedBefore: Date,
    limit: number,
  ): Promise<Bookmark[]> {
    const docs = await this.model
      .find({
        $or: [
          { lastCheckedAt: null },
          { lastCheckedAt: { $lt: checkedBefore } },
        ],
      })
      .select('_id bookmarkURL userId')
      .limit(limit)
      .lean()
      .exec();
    return BookmarkMapper.toDomainList(docs);
  }

  async bulkSetLinkStatus(
    results: { id: string; isDeadLink: boolean }[],
  ): Promise<void> {
    if (results.length === 0) return;
    const now = new Date();
    await this.model.bulkWrite(
      results.map(({ id, isDeadLink }) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { isDeadLink, lastCheckedAt: now } },
        },
      })),
    );
  }

  /** Maps domain field names to the persisted ones, deriving URL-based fields. */
  private toDoc(data: Partial<Bookmark>): Record<string, unknown> {
    const { id: _id, creationDate: _c, updateDate: _u, ...rest } = data;
    if (rest.bookmarkURL) {
      rest.normalizedUrl = normalizeUrl(rest.bookmarkURL);
      rest.domain = domainOf(rest.bookmarkURL);
    }
    return rest;
  }

  /** New bookmarks start unread, newest first, and "opened" when saved. */
  private withDefaults(data: Partial<Bookmark>, offset = 0) {
    const now = Date.now();
    return {
      ...this.toDoc(data),
      status: data.status ?? 'unread',
      position: data.position ?? -(now + offset),
      lastOpenedAt: new Date(now),
    };
  }
}
