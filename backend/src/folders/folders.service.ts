import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FoldersRepository } from './folders.repository';
import { CreateFolderDto } from './dto/create-folder.dto';
import { BookmarksService } from '../bookmarks/bookmarks.service';

@Injectable()
export class FoldersService {
  constructor(
    private readonly foldersRepository: FoldersRepository,
    @Inject(forwardRef(() => BookmarksService))
    private readonly bookmarksService: BookmarksService,
  ) {}

  async createFolder(userId: string, createFolderDto: CreateFolderDto) {
    const slug = await this.generateUniqueSlug(userId, createFolderDto.name);
    return this.foldersRepository.create({ ...createFolderDto, userId, slug });
  }

  private async generateUniqueSlug(
    userId: string,
    name: string,
  ): Promise<string> {
    const baseSlug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'folder';
    let slug = baseSlug;
    let counter = 1;
    while (await this.foldersRepository.findOne({ userId, slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  async getAllFolders(userId: string) {
    await this.foldersRepository.ensureInbox(userId);
    return this.foldersRepository.findAll({ userId });
  }

  async getFolderById(userId: string, id: string) {
    const folder = await this.foldersRepository.findOne({ _id: id, userId });
    if (!folder) {
      throw new NotFoundException(`Folder with id ${id} not found`);
    }
    return folder;
  }

  async getFolderByIdUnscoped(id: string) {
    return this.foldersRepository.findOne({ _id: id });
  }

  async getPublicFolderBySlug(userId: string, slug: string) {
    const folder = await this.foldersRepository.findOne({ userId, slug });
    if (!folder) throw new NotFoundException('Folder not found');
    if (!folder.isPublic) throw new NotFoundException('Folder not found'); // return 404 instead of 403 to avoid leaking existence
    return folder;
  }

  async getChildren(userId: string, id: string) {
    return this.foldersRepository.findAll({ parentId: id, userId });
  }

  async updateFolder(
    userId: string,
    id: string,
    updateFolderDto: Partial<CreateFolderDto>,
  ) {
    const dataToUpdate: any = { ...updateFolderDto };

    const existing = await this.foldersRepository.findOne({ _id: id, userId });
    if (!existing) {
      throw new NotFoundException(`Folder with id ${id} not found`);
    }

    if (updateFolderDto.name && existing.name !== updateFolderDto.name) {
      dataToUpdate.slug = await this.generateUniqueSlug(
        userId,
        updateFolderDto.name,
      );
    } else if (updateFolderDto.isPublic && !existing.slug) {
      dataToUpdate.slug = await this.generateUniqueSlug(userId, existing.name);
    }

    const updated = await this.foldersRepository.update(
      { _id: id, userId },
      dataToUpdate,
    );
    if (!updated) {
      throw new NotFoundException(`Folder with id ${id} not found`);
    }
    return updated;
  }

  async deleteFolder(
    userId: string,
    id: string,
    action?: 'delete_bookmarks' | 'move_to_inbox',
  ) {
    const exists = await this.foldersRepository.findOne({ _id: id, userId });
    if (!exists) {
      throw new NotFoundException(`Folder with id ${id} not found`);
    }

    if (action === 'delete_bookmarks') {
      await this.bookmarksService.deleteByFolderId(userId, id);
    } else if (action === 'move_to_inbox') {
      const folders = await this.foldersRepository.findAll({ userId });
      const inbox = folders.find((f) => f.name === 'Inbox' && !f.parentId);
      if (inbox) {
        await this.bookmarksService.moveByFolderId(
          userId,
          id,
          (inbox._id || inbox.id).toString(),
        );
      }
    }

    await this.foldersRepository.delete({ _id: id, userId });
  }
}
