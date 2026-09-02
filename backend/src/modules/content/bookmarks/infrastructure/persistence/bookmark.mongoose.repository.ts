import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Bookmark as BookmarkSchema,
  BookmarkDocument,
} from './bookmark.schema';
import { IBookmarkRepository } from '../../domain/repositories/bookmark.repository.interface';
import { Bookmark } from '../../domain/entities/bookmark.entity';
import { BookmarkMapper } from './bookmark.mapper';

@Injectable()
export class BookmarksMongooseRepository implements IBookmarkRepository {
  constructor(
    @InjectModel(BookmarkSchema.name) private model: Model<BookmarkDocument>,
  ) {}

  async create(data: Partial<Bookmark>): Promise<Bookmark> {
    const created = await this.model.create(data as any);
    return BookmarkMapper.toDomain(created);
  }

  async findOne(filter: Record<string, unknown>): Promise<Bookmark | null> {
    const doc = await this.model
      .findOne(filter)
      .lean({ virtuals: true })
      .exec();
    if (!doc) return null;
    return BookmarkMapper.toDomain(doc);
  }

  async findWithFilter(
    filter: Record<string, unknown>,
    options?: { limit?: number; includeContent?: boolean },
  ): Promise<Bookmark[]> {
    let query = this.model
      .find(filter)
      .sort({ creationDate: -1 })
      .select(options?.includeContent ? '' : '-content');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const docs = await query.lean({ virtuals: true }).exec();
    return BookmarkMapper.toDomainList(docs);
  }

  async update(
    filter: Record<string, unknown>,
    data: Partial<Bookmark>,
  ): Promise<Bookmark | null> {
    const updated = await this.model
      .findOneAndUpdate(filter, data, { new: true })
      .lean({ virtuals: true })
      .exec();
    if (!updated) return null;
    return BookmarkMapper.toDomain(updated);
  }

  async updateById(
    id: string,
    data: Partial<Bookmark>,
  ): Promise<Bookmark | null> {
    const updated = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean({ virtuals: true })
      .exec();
    if (!updated) return null;
    return BookmarkMapper.toDomain(updated);
  }

  async delete(filter: Record<string, unknown>): Promise<boolean> {
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

  async deleteByFolderId(userId: string, folderId: string): Promise<void> {
    await this.model.deleteMany({ folderId, userId }).exec();
  }

  async moveByFolderId(
    userId: string,
    oldFolderId: string,
    newFolderId: string,
  ): Promise<void> {
    await this.model
      .updateMany(
        { folderId: oldFolderId, userId },
        { $set: { folderId: newFolderId } },
      )
      .exec();
  }

  async getTags(userId: string): Promise<string[]> {
    return this.model.distinct('tags', { userId }).exec();
  }
}
