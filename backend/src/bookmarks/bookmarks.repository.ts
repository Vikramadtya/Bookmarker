import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bookmark, BookmarkDocument } from './schemas/bookmark.schema';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { BaseRepository } from '../common/database/base.repository';

@Injectable()
export class BookmarksRepository extends BaseRepository<BookmarkDocument> {
  constructor(
    @InjectModel(Bookmark.name) bookmarkModel: Model<BookmarkDocument>,
  ) {
    super(bookmarkModel);
  }

  async findWithFilter(
    filter: Record<string, unknown>,
    options?: { limit?: number },
  ): Promise<BookmarkDocument[]> {
    let query = this.model.find(filter).sort({ creationDate: -1 });
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    return query.lean({ virtuals: true }).exec() as unknown as Promise<
      BookmarkDocument[]
    >;
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
