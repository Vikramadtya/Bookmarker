import { Folder } from '../entities/folder.entity';

export const IFolderRepository = Symbol('IFolderRepository');

export interface IFolderRepository {
  create(data: Partial<Folder>): Promise<Folder>;
  findOne(filter: Record<string, unknown>): Promise<Folder | null>;
  find(filter: Record<string, unknown>): Promise<Folder[]>;
  update(
    filter: Record<string, unknown>,
    data: Partial<Folder>,
  ): Promise<Folder | null>;
  updateById(id: string, data: Partial<Folder>): Promise<Folder | null>;
  delete(filter: Record<string, unknown>): Promise<boolean>;
  deleteMany(filter: Record<string, unknown>): Promise<number>;
}
