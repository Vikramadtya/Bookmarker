export type ScrapeStatus = 'pending' | 'done' | 'failed';

export interface Bookmark {
  id: string;
  userId: string;
  title: string;
  bookmarkURL: string;
  description: string;
  logoURL: string;
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
  creationDate: Date;
  updateDate: Date;
}
