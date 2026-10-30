import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Bookmark as BookmarkSchema,
  BookmarkDocument,
} from './bookmark.schema';
import {
  Filter,
  IBookmarkRepository,
  ScrapeResult,
} from '../../domain/repositories/bookmark.repository.interface';
import { Bookmark } from '../../domain/entities/bookmark.entity';
import { BookmarkMapper } from './bookmark.mapper';

const SORT_NEWEST = { createdAt: -1, _id: -1 } as const;

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
export class BookmarksMongooseRepository implements IBookmarkRepository {
  constructor(
    @InjectModel(BookmarkSchema.name) private model: Model<BookmarkDocument>,
  ) {}

  async create(data: Partial<Bookmark>): Promise<Bookmark> {
    const created = await this.model.create(this.toDoc(data) as any);
    return BookmarkMapper.toDomain((created as any).toObject());
  }

  async createMany(data: Partial<Bookmark>[]): Promise<Bookmark[]> {
    if (data.length === 0) return [];
    const created = await this.model.insertMany(
      data.map((d) => this.toDoc(d)) as any[],
    );
    return created.map((doc: any) => BookmarkMapper.toDomain(doc.toObject()));
  }

  async findOne(filter: Filter): Promise<Bookmark | null> {
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? BookmarkMapper.toDomain(doc) : null;
  }

  async find(
    filter: Filter,
    options?: { limit?: number; includeContent?: boolean },
  ): Promise<Bookmark[]> {
    let query = this.model.find(filter).sort(SORT_NEWEST) as any;
    if (!options?.includeContent) query = query.select('-content');
    if (options?.limit) query = query.limit(options.limit);
    return BookmarkMapper.toDomainList(await query.lean().exec());
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

  async getTags(userId: string): Promise<string[]> {
    const tags = await this.model.distinct('tags', { userId }).exec();
    return (tags as string[]).sort((a, b) => a.localeCompare(b));
  }

  async findExistingUrls(userId: string): Promise<Set<string>> {
    return new Set(await this.model.distinct('bookmarkURL', { userId }).exec());
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

  /** Maps domain field names to the persisted ones. */
  private toDoc(data: Partial<Bookmark>): Record<string, unknown> {
    const { id: _id, creationDate: _c, updateDate: _u, ...rest } = data;
    return rest;
  }
}
