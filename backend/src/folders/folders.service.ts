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
    return this.foldersRepository.create({ ...createFolderDto, userId });
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

  async getChildren(userId: string, id: string) {
    return this.foldersRepository.findAll({ parentId: id, userId });
  }

  async updateFolder(
    userId: string,
    id: string,
    updateFolderDto: Partial<CreateFolderDto>,
  ) {
    const updated = await this.foldersRepository.update(
      { _id: id, userId },
      updateFolderDto,
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
