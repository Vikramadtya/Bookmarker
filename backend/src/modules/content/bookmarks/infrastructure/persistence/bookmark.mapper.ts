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
      // Bookmarks saved before read status existed count as already processed.
      status: doc.status ?? 'done',
      pinned: !!doc.pinned,
      openCount: doc.openCount ?? 0,
      lastOpenedAt: doc.lastOpenedAt ?? doc.createdAt,
      snoozedUntil: doc.snoozedUntil ?? null,
      revisitAt: doc.revisitAt ?? null,
      normalizedUrl: doc.normalizedUrl ?? '',
      domain: doc.domain ?? '',
      position: doc.position ?? -new Date(doc.createdAt).getTime(),
      summary: doc.summary ?? '',
      highlights: (doc.highlights ?? []).map((h: any) => ({
        id: h.id,
        text: h.text,
        note: h.note ?? '',
        createdAt: h.createdAt,
      })),
      suggestedTags: doc.suggestedTags ?? [],
      suggestedFolderId: doc.suggestedFolderId ?? null,
      creationDate: doc.createdAt,
      updateDate: doc.updatedAt,
    };
  }

  static toDomainList(docs: any[]): Bookmark[] {
    return docs.map(BookmarkMapper.toDomain);
  }
}
