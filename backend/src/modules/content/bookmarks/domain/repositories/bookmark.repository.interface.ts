import { Bookmark, ScrapeStatus } from '../entities/bookmark.entity';

export const IBookmarkRepository = Symbol('IBookmarkRepository');

export type Filter = Record<string, unknown>;

export interface ScrapeResult {
  title?: string;
  description?: string;
  logoURL?: string;
  content?: string;
  isArticle?: boolean;
  scrapeStatus: ScrapeStatus;
}

export interface IBookmarkRepository {
  create(data: Partial<Bookmark>): Promise<Bookmark>;
  createMany(data: Partial<Bookmark>[]): Promise<Bookmark[]>;
  findOne(filter: Filter): Promise<Bookmark | null>;
  find(
    filter: Filter,
    options?: { limit?: number; includeContent?: boolean },
  ): Promise<Bookmark[]>;
  update(filter: Filter, data: Partial<Bookmark>): Promise<Bookmark | null>;
  delete(filter: Filter): Promise<boolean>;

  bulkDelete(userId: string, ids: string[]): Promise<void>;
  bulkMove(userId: string, ids: string[], folderId: string): Promise<void>;
  deleteByFolderIds(userId: string, folderIds: string[]): Promise<void>;
  moveByFolderIds(
    userId: string,
    folderIds: string[],
    targetFolderId: string,
  ): Promise<void>;
  deleteAllByUser(userId: string): Promise<void>;

  getTags(userId: string): Promise<string[]>;
  findExistingUrls(userId: string): Promise<Set<string>>;

  /** Fills only the fields the user has left empty, in a single atomic update. */
  applyScrapeResult(id: string, result: ScrapeResult): Promise<Bookmark | null>;
  findStaleLinks(checkedBefore: Date, limit: number): Promise<Bookmark[]>;
  bulkSetLinkStatus(
    results: { id: string; isDeadLink: boolean }[],
  ): Promise<void>;
}
