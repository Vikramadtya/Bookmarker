import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFolderRepository } from '../../domain/repositories/folder.repository.interface';
import { IBookmarkRepository } from '@content/bookmarks/domain/repositories/bookmark.repository.interface';
import { CreateFolderDto } from '../../presentation/http/dto/create-folder.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class FoldersService {
  private readonly jwtSecret: string;

  constructor(
    @Inject('IFolderRepository')
    private readonly foldersRepository: IFolderRepository,
    // Direct repo access removes the forwardRef circular dep with BookmarksModule
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    private readonly config: ConfigService,
  ) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET is required but not set. Cannot generate unlock tokens.',
      );
    }
    this.jwtSecret = secret;
  }

  // ─── Folder CRUD ───────────────────────────────────────────────────────────

  async createFolder(userId: string, createFolderDto: CreateFolderDto) {
    const slug = await this.generateUniqueSlug(userId, createFolderDto.name);
    return this.foldersRepository.create({ ...createFolderDto, userId, slug });
  }

  private async ensureInbox(userId: string) {
    let inbox = await this.foldersRepository.findOne({
      userId,
      name: 'Inbox',
      parentId: null,
    });
    if (!inbox) {
      inbox = await this.foldersRepository.create({
        userId,
        name: 'Inbox',
        slug: 'inbox',
        parentId: null,
      });
    }
    return inbox;
  }

  async getAllFolders(userId: string) {
    await this.ensureInbox(userId);
    return this.foldersRepository.find({ userId });
  }

  async getFolderById(userId: string, id: string) {
    const folder = await this.foldersRepository.findOne({ _id: id, userId });
    if (!folder) throw new NotFoundException(`Folder ${id} not found`);
    return folder;
  }

  /** Fetches any folder regardless of ownership — used for lock checks on shared routes. */
  async getFolderByIdUnscoped(id: string) {
    return this.foldersRepository.findOne({ _id: id });
  }

  /** Returns the folder only if it is both owned by userId and marked public. Returns 404 in all other cases to avoid leaking existence. */
  async getPublicFolderBySlug(userId: string, slug: string) {
    const folder = await this.foldersRepository.findOne({ userId, slug });
    if (!folder || !folder.isPublic)
      throw new NotFoundException('Folder not found');
    return folder;
  }

  async getChildren(userId: string, id: string) {
    return this.foldersRepository.find({ parentId: id, userId });
  }

  async updateFolder(
    userId: string,
    id: string,
    dto: Partial<CreateFolderDto>,
  ) {
    const existing = await this.foldersRepository.findOne({ _id: id, userId });
    if (!existing) throw new NotFoundException(`Folder ${id} not found`);

    const patch: Record<string, unknown> = {};

    // ── Name / slug ──────────────────────────────────────────────────────────
    if (dto.name && existing.name !== dto.name) {
      patch.name = dto.name;
      patch.slug = await this.generateUniqueSlug(userId, dto.name);
    }

    // ── Visibility (public) — regenerate slug if missing ────────────────────
    if (dto.isPublic !== undefined) {
      patch.isPublic = dto.isPublic;
      if (dto.isPublic && !existing.slug) {
        patch.slug = await this.generateUniqueSlug(userId, existing.name);
      }
    }

    // ── Hidden flag ──────────────────────────────────────────────────────────
    if (dto.isHidden !== undefined) patch.isHidden = dto.isHidden;

    // ── Lock / unlock ────────────────────────────────────────────────────────
    if (dto.password) {
      patch.passwordHash = await bcrypt.hash(dto.password, 10);
      patch.isLocked = true;
    } else if (dto.isLocked === false) {
      patch.isLocked = false;
      patch.passwordHash = null;
    } else if (dto.isLocked === true) {
      patch.isLocked = true;
    }

    // ── parentId ─────────────────────────────────────────────────────────────
    if (dto.parentId !== undefined) patch.parentId = dto.parentId;

    const updated = await this.foldersRepository.update(
      { _id: id, userId },
      patch,
    );
    if (!updated) throw new NotFoundException(`Folder ${id} not found`);
    return updated;
  }

  async deleteFolder(
    userId: string,
    id: string,
    action?: 'delete_bookmarks' | 'move_to_inbox',
  ) {
    const exists = await this.foldersRepository.findOne({ _id: id, userId });
    if (!exists) throw new NotFoundException(`Folder ${id} not found`);

    if (action === 'delete_bookmarks') {
      await this.bookmarksRepository.deleteByFolderId(userId, id);
    } else if (action === 'move_to_inbox') {
      const folders = await this.foldersRepository.find({ userId });
      const inbox = folders.find((f) => f.name === 'Inbox' && !f.parentId);
      if (inbox) {
        await this.bookmarksRepository.moveByFolderId(
          userId,
          id,
          inbox.id.toString(),
        );
      }
    }

    await this.foldersRepository.delete({ _id: id, userId });
  }

  // ─── Password / Token Helpers ─────────────────────────────────────────────

  async verifyPassword(id: string, password?: string): Promise<boolean> {
    const folder = await this.foldersRepository.findOne({ _id: id });
    if (!folder) throw new NotFoundException('Folder not found');
    if (!folder.isLocked) return true;
    if (!password) return false;
    return bcrypt.compare(password, folder.passwordHash as string);
  }

  generateUnlockToken(folderId: string, passwordHash: string): string {
    return crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${folderId}:${passwordHash}`)
      .digest('hex');
  }

  verifyUnlockToken(
    folderId: string,
    passwordHash: string,
    token: string,
  ): boolean {
    return this.generateUnlockToken(folderId, passwordHash) === token;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

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
      slug = `${baseSlug}-${counter++}`;
    }
    return slug;
  }
}
