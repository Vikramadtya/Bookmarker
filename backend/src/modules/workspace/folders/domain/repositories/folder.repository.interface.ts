import { Folder } from '../entities/folder.entity';

export const IFolderRepository = Symbol('IFolderRepository');

export type Filter = Record<string, unknown>;

export interface IFolderRepository {
  create(data: Partial<Folder>): Promise<Folder>;
  findOne(filter: Filter): Promise<Folder | null>;
  find(filter: Filter): Promise<Folder[]>;
  update(filter: Filter, data: Partial<Folder>): Promise<Folder | null>;
  delete(filter: Filter): Promise<boolean>;
  deleteMany(filter: Filter): Promise<number>;
  /** Slugs of this user that equal `base` or look like `base-<n>`. */
  findSlugsLike(userId: string, base: string): Promise<string[]>;
}
