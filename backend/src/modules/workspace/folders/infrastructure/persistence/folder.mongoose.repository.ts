import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Folder as FolderSchema, FolderDocument } from './folder.schema';
import {
  Filter,
  IFolderRepository,
} from '../../domain/repositories/folder.repository.interface';
import { Folder } from '../../domain/entities/folder.entity';
import { FolderMapper } from './folder.mapper';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class FoldersMongooseRepository implements IFolderRepository {
  constructor(
    @InjectModel(FolderSchema.name) private model: Model<FolderDocument>,
  ) {}

  async create(data: Partial<Folder>): Promise<Folder> {
    const { id: _id, ...rest } = data;
    const created: any = await this.model.create(rest as any);
    return FolderMapper.toDomain(created.toObject());
  }

  async findOne(filter: Filter): Promise<Folder | null> {
    const doc = await this.model.findOne(filter).lean().exec();
    return doc ? FolderMapper.toDomain(doc) : null;
  }

  async find(filter: Filter): Promise<Folder[]> {
    return FolderMapper.toDomainList(
      await this.model.find(filter).lean().exec(),
    );
  }

  async update(filter: Filter, data: Partial<Folder>): Promise<Folder | null> {
    const { id: _id, ...rest } = data;
    const updated = await this.model
      .findOneAndUpdate(filter, { $set: rest } as any, {
        returnDocument: 'after',
      })
      .lean()
      .exec();
    return updated ? FolderMapper.toDomain(updated) : null;
  }

  async delete(filter: Filter): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  async deleteMany(filter: Filter): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async findSlugsLike(userId: string, base: string): Promise<string[]> {
    const docs = await this.model
      .find({ userId, slug: new RegExp(`^${escapeRegex(base)}(-\\d+)?$`) })
      .select('slug')
      .lean()
      .exec();
    return docs.map((d: any) => d.slug);
  }
}
