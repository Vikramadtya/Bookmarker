import { Folder } from '../../domain/entities/folder.entity';

export class FolderMapper {
  static toDomain(doc: any): Folder {
    return {
      id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      parentId: doc.parentId ?? null,
      userId: doc.userId,
      isPublic: !!doc.isPublic,
      isHidden: !!doc.isHidden,
      isLocked: !!doc.isLocked,
      // Folders created before the flag existed are recognised by name.
      isInbox: !!doc.isInbox || (doc.name === 'Inbox' && !doc.parentId),
      passwordHash: doc.passwordHash ?? null,
    };
  }

  static toDomainList(docs: any[]): Folder[] {
    return docs.map(FolderMapper.toDomain);
  }
}
