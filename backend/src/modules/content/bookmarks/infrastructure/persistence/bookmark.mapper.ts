import { Bookmark } from '../../domain/entities/bookmark.entity';

export class BookmarkMapper {
  static toDomain(doc: any): Bookmark {
    return {
      id: String(doc._id),
      userId: doc.userId,
      title: doc.title ?? '',
      bookmarkURL: doc.bookmarkURL,
      description: doc.description ?? '',
      logoURL: doc.logoURL ?? '',
      imageURL: doc.imageURL ?? '',
      tags: doc.tags ?? [],
      isFavorite: !!doc.isFavorite,
      folderId: doc.folderId,
      author: doc.author ?? '',
      comments: doc.comments ?? [],
      content: doc.content ?? null,
      isArticle: !!doc.isArticle,
      isDeadLink: !!doc.isDeadLink,
      lastCheckedAt: doc.lastCheckedAt ?? null,
      scrapeStatus: doc.scrapeStatus ?? 'done',
      creationDate: doc.createdAt,
      updateDate: doc.updatedAt,
    };
  }

  static toDomainList(docs: any[]): Bookmark[] {
    return docs.map(BookmarkMapper.toDomain);
  }
}
