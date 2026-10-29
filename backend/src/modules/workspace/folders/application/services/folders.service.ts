import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { IFolderRepository } from '../../domain/repositories/folder.repository.interface';
import { Folder } from '../../domain/entities/folder.entity';
import { IBookmarkRepository } from '@content/bookmarks/domain/repositories/bookmark.repository.interface';
import { CreateFolderDto } from '../../presentation/http/dto/create-folder.dto';

const UNLOCK_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const isDuplicateKey = (err: any) => err?.code === 11000;

@Injectable()
export class FoldersService {
  private readonly secret: string;

  constructor(
    @Inject('IFolderRepository')
    private readonly foldersRepository: IFolderRepository,
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async createFolder(userId: string, dto: CreateFolderDto): Promise<Folder> {
    if (dto.parentId) await this.assertValidParent(userId, null, dto.parentId);
    const { password, isLocked: _locked, ...rest } = dto;
    return this.createWithSlug(userId, {
      ...rest,
      parentId: dto.parentId ?? null,
      ...(password && {
        passwordHash: await bcrypt.hash(password, 10),
        isLocked: true,
      }),
    });
  }

  /** Returns all folders of the user, creating the Inbox on first access. */
  async getAllFolders(userId: string): Promise<Folder[]> {
    const folders = await this.foldersRepository.find({ userId });
    if (folders.some((f) => f.isInbox)) return folders;

    try {
      const inbox = await this.createWithSlug(userId, {
        name: 'Inbox',
        parentId: null,
        isInbox: true,
      });
      return [...folders, inbox];
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      return this.foldersRepository.find({ userId }); // lost a creation race
    }
  }

  async getInbox(userId: string): Promise<Folder> {
    const inbox = (await this.getAllFolders(userId)).find((f) => f.isInbox);
    if (!inbox) throw new NotFoundException('Inbox not found');
    return inbox;
  }

  async getFolderById(userId: string, id: string): Promise<Folder> {
    const folder = await this.foldersRepository.findOne({ _id: id, userId });
    if (!folder) throw new NotFoundException(`Folder ${id} not found`);
    return folder;
  }

  /** Several folders by id regardless of owner; callers must check ownership. */
  async getFoldersByIds(ids: string[]): Promise<Folder[]> {
    return this.foldersRepository.find({ _id: { $in: ids } });
  }

  /** Returns the folder only if owned by userId and public; 404 otherwise to avoid leaking existence. */
  async getPublicFolderBySlug(userId: string, slug: string): Promise<Folder> {
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
  ): Promise<Folder> {
    const existing = await this.getFolderById(userId, id);
    const patch: Partial<Folder> = {};

    if (
      existing.isInbox &&
      (dto.name !== undefined || dto.parentId !== undefined)
    ) {
      throw new BadRequestException('The Inbox cannot be renamed or moved');
    }

    if (dto.name && dto.name !== existing.name) {
      patch.name = dto.name;
      patch.slug = await this.nextSlug(userId, dto.name);
    }

    if (dto.isPublic !== undefined) {
      patch.isPublic = dto.isPublic;
      if (dto.isPublic && !existing.slug) {
        patch.slug = await this.nextSlug(userId, existing.name);
      }
    }

    if (dto.isHidden !== undefined) patch.isHidden = dto.isHidden;

    if (dto.password) {
      patch.passwordHash = await bcrypt.hash(dto.password, 10);
      patch.isLocked = true;
    } else if (dto.isLocked === false) {
      patch.isLocked = false;
      patch.passwordHash = null;
    } else if (dto.isLocked === true) {
      if (!existing.passwordHash) {
        throw new BadRequestException(
          'A password is required to lock a folder',
        );
      }
      patch.isLocked = true;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId) await this.assertValidParent(userId, id, dto.parentId);
      patch.parentId = dto.parentId ?? null;
    }

    const updated = await this.foldersRepository.update(
      { _id: id, userId },
      patch,
    );
    if (!updated) throw new NotFoundException(`Folder ${id} not found`);
    return updated;
  }

  /** Deletes the folder and all its descendants; bookmarks are moved to the Inbox unless told otherwise. */
  async deleteFolder(
    userId: string,
    id: string,
    action: 'delete_bookmarks' | 'move_to_inbox' = 'move_to_inbox',
  ): Promise<void> {
    const folders = await this.getAllFolders(userId);
    const target = folders.find((f) => f.id === id);
    if (!target) throw new NotFoundException(`Folder ${id} not found`);
    if (target.isInbox)
      throw new BadRequestException('The Inbox cannot be deleted');

    const doomed = this.collectDescendants(folders, id);

    if (action === 'delete_bookmarks') {
      await this.bookmarksRepository.deleteByFolderIds(userId, doomed);
    } else {
      const inbox = folders.find((f) => f.isInbox)!;
      await this.bookmarksRepository.moveByFolderIds(userId, doomed, inbox.id);
    }
    await this.foldersRepository.deleteMany({ _id: { $in: doomed }, userId });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.foldersRepository.deleteMany({ userId });
  }

  // ─── Password / unlock tokens ──────────────────────────────────────────────

  async verifyPassword(folder: Folder, password?: string): Promise<boolean> {
    if (!folder.isLocked) return true;
    if (!password || !folder.passwordHash) return false;
    return bcrypt.compare(password, folder.passwordHash);
  }

  /** Token = `<expiryMs>.<hmac>`; changing the folder password invalidates it. */
  generateUnlockToken(folder: Folder): string {
    const expires = Date.now() + UNLOCK_TOKEN_TTL_MS;
    return `${expires}.${this.sign(folder, expires)}`;
  }

  verifyUnlockToken(folder: Folder, token: string | undefined): boolean {
    if (!token) return false;
    const [expiresRaw, signature = ''] = token.split('.');
    const expires = Number(expiresRaw);
    if (!Number.isFinite(expires) || expires < Date.now()) return false;

    const expected = Buffer.from(this.sign(folder, expires));
    const actual = Buffer.from(signature);
    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  }

  /** Throws 403 if the folder is locked and the token does not unlock it. */
  assertUnlocked(folder: Folder, token: string | undefined): void {
    if (folder.isLocked && !this.verifyUnlockToken(folder, token)) {
      throw new ForbiddenException(
        'Folder is locked. Provide a valid x-folder-token header.',
      );
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private sign(folder: Folder, expires: number): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(`${folder.id}:${folder.passwordHash}:${expires}`)
      .digest('hex');
  }

  private collectDescendants(folders: Folder[], rootId: string): string[] {
    const byParent = new Map<string, string[]>();
    for (const f of folders) {
      if (!f.parentId) continue;
      byParent.set(f.parentId, [...(byParent.get(f.parentId) ?? []), f.id]);
    }
    const result = [rootId];
    for (let i = 0; i < result.length; i++)
      result.push(...(byParent.get(result[i]) ?? []));
    return result;
  }

  /** The parent must belong to the user and must not be the folder itself or one of its descendants. */
  private async assertValidParent(
    userId: string,
    folderId: string | null,
    parentId: string,
  ) {
    const folders = await this.foldersRepository.find({ userId });
    if (!folders.some((f) => f.id === parentId)) {
      throw new BadRequestException('Parent folder not found');
    }
    if (
      folderId &&
      this.collectDescendants(folders, folderId).includes(parentId)
    ) {
      throw new BadRequestException('A folder cannot be moved into itself');
    }
  }

  /** Creates a folder, retrying with a fresh slug if a concurrent request took it. */
  private async createWithSlug(
    userId: string,
    data: Partial<Folder> & { name: string },
  ): Promise<Folder> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.foldersRepository.create({
          ...data,
          userId,
          slug: await this.nextSlug(userId, data.name),
        });
      } catch (err) {
        if (!isDuplicateKey(err) || attempt >= 3) throw err;
      }
    }
  }

  private async nextSlug(userId: string, name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'folder';
    const taken = new Set(
      await this.foldersRepository.findSlugsLike(userId, base),
    );
    if (!taken.has(base)) return base;
    let counter = 1;
    while (taken.has(`${base}-${counter}`)) counter++;
    return `${base}-${counter}`;
  }
}
