import { Folder } from '../../domain/entities/folder.entity';
import { FolderDocument } from './folder.schema';

export class FolderMapper {
  static toDomain(doc: FolderDocument): Folder {
    return new Folder(
      doc._id.toString(),
      doc.name,
      doc.slug,
      doc.parentId,
      doc.userId,
      doc.isPublic,
      doc.isHidden,
      doc.isLocked,
      doc.passwordHash,
    );
  }

  static toDomainList(docs: FolderDocument[]): Folder[] {
    return docs.map((doc) => FolderMapper.toDomain(doc));
  }
}
