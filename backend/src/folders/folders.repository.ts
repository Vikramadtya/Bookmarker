import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { BaseRepository } from '../common/database/base.repository';

@Injectable()
export class FoldersRepository extends BaseRepository<FolderDocument> {
  constructor(@InjectModel(Folder.name) folderModel: Model<FolderDocument>) {
    super(folderModel);
  }

  async findAllFolders(): Promise<FolderDocument[]> {
    return this.model
      .find()
      .collation({ locale: 'en' })
      .sort({ name: 1 })
      .lean({ virtuals: true })
      .exec() as unknown as Promise<FolderDocument[]>;
  }

  async findByParentId(parentId: string): Promise<FolderDocument[]> {
    return this.model
      .find({ parentId })
      .collation({ locale: 'en' })
      .sort({ name: 1 })
      .lean({ virtuals: true })
      .exec() as unknown as Promise<FolderDocument[]>;
  }

  async ensureInbox(userId: string): Promise<FolderDocument> {
    return this.model
      .findOneAndUpdate(
        { name: 'Inbox', userId, parentId: null },
        {
          $setOnInsert: {
            name: 'Inbox',
            userId,
            slug: 'inbox',
            parentId: null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean({ virtuals: true })
      .exec() as unknown as Promise<FolderDocument>;
  }
}
