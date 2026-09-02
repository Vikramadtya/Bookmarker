import { Bookmark } from '../entities/bookmark.entity';

export const IBookmarkRepository = Symbol('IBookmarkRepository');

export interface IBookmarkRepository {
  create(data: Partial<Bookmark>): Promise<Bookmark>;
  findOne(filter: Record<string, unknown>): Promise<Bookmark | null>;
  findWithFilter(
    filter: Record<string, unknown>,
    options?: { limit?: number; includeContent?: boolean },
  ): Promise<Bookmark[]>;
  update(
    filter: Record<string, unknown>,
    data: Partial<Bookmark>,
  ): Promise<Bookmark | null>;
  updateById(id: string, data: Partial<Bookmark>): Promise<Bookmark | null>;
  delete(filter: Record<string, unknown>): Promise<boolean>;

  bulkDelete(userId: string, ids: string[]): Promise<void>;
  bulkMove(userId: string, ids: string[], folderId: string): Promise<void>;
  deleteByFolderId(userId: string, folderId: string): Promise<void>;
  moveByFolderId(
    userId: string,
    oldFolderId: string,
    newFolderId: string,
  ): Promise<void>;
  getTags(userId: string): Promise<string[]>;
}
