import { Bookmark } from '../../domain/entities/bookmark.entity';
import { BookmarkDocument } from './bookmark.schema';

export class BookmarkMapper {
  static toDomain(doc: BookmarkDocument): Bookmark {
    return new Bookmark(
      doc._id.toString(),
      doc.userId,
      doc.title,
      doc.bookmarkURL,
      doc.description,
      doc.logoURL,
      doc.tags,
      doc.isFavorite,
      doc.folderId,
      doc.author,
      doc.comments || [],
      doc.content,
      doc.isArticle,
      doc.isDeadLink,
      doc.lastCheckedAt,
    );
  }

  static toDomainList(docs: BookmarkDocument[]): Bookmark[] {
    return docs.map((doc) => BookmarkMapper.toDomain(doc));
  }
}
