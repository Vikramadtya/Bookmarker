export type ReadStatus = 'unread' | 'reading' | 'done' | 'archived';
export type ScrapeStatus = 'pending' | 'done' | 'failed';

export interface Highlight {
  id: string;
  text: string;
  note: string;
  createdAt: Date;
}

export interface Bookmark {
  id: string;
  userId: string;
  title: string;
  bookmarkURL: string;
  description: string;
  logoURL: string;
  imageURL: string;
  tags: string[];
  isFavorite: boolean;
  folderId: string;
  author: string;
  comments: string[];
  content: string | null;
  isArticle: boolean;
  isDeadLink: boolean;
  lastCheckedAt: Date | null;
  scrapeStatus: ScrapeStatus;
  status: ReadStatus;
  pinned: boolean;
  openCount: number;
  lastOpenedAt: Date;
  snoozedUntil: Date | null;
  normalizedUrl: string;
  domain: string;
  /** Manual order inside a folder; lower comes first. */
  position: number;
  summary: string;
  highlights: Highlight[];
  suggestedTags: string[];
  suggestedFolderId: string | null;
  creationDate: Date;
  updateDate: Date;
}
