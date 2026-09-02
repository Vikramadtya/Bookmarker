import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Folder as FolderSchema, FolderDocument } from './folder.schema';
import { IFolderRepository } from '../../domain/repositories/folder.repository.interface';
import { Folder } from '../../domain/entities/folder.entity';
import { FolderMapper } from './folder.mapper';

@Injectable()
export class FoldersMongooseRepository implements IFolderRepository {
  constructor(
    @InjectModel(FolderSchema.name) private model: Model<FolderDocument>,
  ) {}

  async create(data: Partial<Folder>): Promise<Folder> {
    const created = await this.model.create(data as any);
    return FolderMapper.toDomain(created);
  }

  async findOne(filter: Record<string, unknown>): Promise<Folder | null> {
    const doc = await this.model
      .findOne(filter)
      .lean({ virtuals: true })
      .exec();
    if (!doc) return null;
    return FolderMapper.toDomain(doc);
  }

  async find(filter: Record<string, unknown>): Promise<Folder[]> {
    const docs = await this.model.find(filter).lean({ virtuals: true }).exec();
    return FolderMapper.toDomainList(docs);
  }

  async update(
    filter: Record<string, unknown>,
    data: Partial<Folder>,
  ): Promise<Folder | null> {
    const updated = await this.model
      .findOneAndUpdate(filter, data, { new: true })
      .lean({ virtuals: true })
      .exec();
    if (!updated) return null;
    return FolderMapper.toDomain(updated);
  }

  async updateById(id: string, data: Partial<Folder>): Promise<Folder | null> {
    const updated = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean({ virtuals: true })
      .exec();
    if (!updated) return null;
    return FolderMapper.toDomain(updated);
  }

  async delete(filter: Record<string, unknown>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  async deleteMany(filter: Record<string, unknown>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }
}
