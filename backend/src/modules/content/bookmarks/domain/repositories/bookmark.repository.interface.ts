import { Bookmark, Highlight, ScrapeStatus } from '../entities/bookmark.entity';

export const IBookmarkRepository = Symbol('IBookmarkRepository');

export type Filter = Record<string, unknown>;

export interface ScrapeResult {
  title?: string;
  description?: string;
  logoURL?: string;
  imageURL?: string;
  summary?: string;
  suggestedTags?: string[];
  suggestedFolderId?: string | null;
  content?: string;
  isArticle?: boolean;
  scrapeStatus: ScrapeStatus;
}

export interface FindOptions {
  limit?: number;
  includeContent?: boolean;
  sort?: Record<string, 1 | -1>;
  /** Case-insensitive ordering for text sorts. */
  caseInsensitive?: boolean;
}

export interface BulkUpdate {
  set?: Partial<Bookmark>;
  addTags?: string[];
  removeTags?: string[];
}

export interface DomainAffinity {
  folders: { folderId: string; count: number }[];
  tags: { tag: string; count: number }[];
}

export interface IBookmarkRepository {
  create(data: Partial<Bookmark>): Promise<Bookmark>;
  createMany(data: Partial<Bookmark>[]): Promise<Bookmark[]>;
  findOne(filter: Filter): Promise<Bookmark | null>;
  find(filter: Filter, options?: FindOptions): Promise<Bookmark[]>;
  count(filter: Filter): Promise<number>;
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
  tagCounts(userId: string): Promise<{ tag: string; count: number }[]>;
  /** Renames a tag and every nested tag below it; merges when `to` exists. */
  renameTag(userId: string, from: string, to: string): Promise<number>;
  removeTag(userId: string, tag: string): Promise<number>;

  bulkUpdate(userId: string, ids: string[], changes: BulkUpdate): Promise<void>;
  recordOpen(userId: string, id: string): Promise<Bookmark | null>;
  addHighlight(
    userId: string,
    id: string,
    highlight: Highlight,
  ): Promise<Highlight[] | null>;
  removeHighlight(
    userId: string,
    id: string,
    highlightId: string,
  ): Promise<Highlight[] | null>;

  findByNormalizedUrl(userId: string, url: string): Promise<Bookmark | null>;
  /** Groups of bookmarks that point at the same page. */
  findDuplicateGroups(userId: string, limit: number): Promise<Bookmark[][]>;
  domainAffinity(userId: string, domain: string): Promise<DomainAffinity>;
  /** Fills normalizedUrl/domain/position on bookmarks saved before they existed. */
  backfillDerived(batch: number): Promise<number>;
  findExistingUrls(userId: string): Promise<Set<string>>;

  /** Fills only the fields the user has left empty, in a single atomic update. */
  applyScrapeResult(id: string, result: ScrapeResult): Promise<Bookmark | null>;
  findStaleLinks(checkedBefore: Date, limit: number): Promise<Bookmark[]>;
  bulkSetLinkStatus(
    results: { id: string; isDeadLink: boolean }[],
  ): Promise<void>;
}
