import { BadRequestException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { Folder } from '../../domain/entities/folder.entity';

const folder = (
  id: string,
  parentId: string | null = null,
  extra: Partial<Folder> = {},
): Folder => ({
  id,
  name: id,
  slug: id,
  parentId,
  userId: 'u',
  isPublic: false,
  isHidden: false,
  isLocked: false,
  isInbox: false,
  passwordHash: null,
  ...extra,
});

function setup(folders: Folder[]) {
  const foldersRepo = {
    find: jest.fn().mockResolvedValue(folders),
    findSlugsLike: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn(),
    create: jest.fn(async (d) => ({ ...folder('new'), ...d })),
  } as any;
  const bookmarksRepo = {
    deleteByFolderIds: jest.fn(),
    moveByFolderIds: jest.fn(),
  } as any;
  const config = { getOrThrow: () => 'secret' } as any;
  return {
    service: new FoldersService(foldersRepo, bookmarksRepo, config),
    foldersRepo,
    bookmarksRepo,
  };
}

describe('FoldersService', () => {
  it('deletes descendants and moves their bookmarks to the inbox', async () => {
    const { service, foldersRepo, bookmarksRepo } = setup([
      folder('inbox', null, { isInbox: true }),
      folder('a'),
      folder('b', 'a'),
      folder('c', 'b'),
      folder('other'),
    ]);
    await service.deleteFolder('u', 'a');

    expect(bookmarksRepo.moveByFolderIds).toHaveBeenCalledWith(
      'u',
      ['a', 'b', 'c'],
      'inbox',
    );
    expect(foldersRepo.deleteMany).toHaveBeenCalledWith({
      _id: { $in: ['a', 'b', 'c'] },
      userId: 'u',
    });
  });

  it('refuses to delete the inbox', async () => {
    const { service } = setup([folder('inbox', null, { isInbox: true })]);
    await expect(service.deleteFolder('u', 'inbox')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects moving a folder into its own descendant', async () => {
    const { service, foldersRepo } = setup([folder('a'), folder('b', 'a')]);
    foldersRepo.findOne = jest.fn().mockResolvedValue(folder('a'));
    await expect(
      service.updateFolder('u', 'a', { parentId: 'b' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a parent that does not belong to the user', async () => {
    const { service } = setup([]);
    await expect(
      service.createFolder('u', { name: 'x', parentId: 'foreign' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates the next free slug', async () => {
    const { service, foldersRepo } = setup([
      folder('inbox', null, { isInbox: true }),
    ]);
    foldersRepo.findSlugsLike.mockResolvedValue(['docs', 'docs-1']);
    const created = await service.createFolder('u', { name: 'Docs!' });
    expect(created.slug).toBe('docs-2');
  });

  describe('unlock tokens', () => {
    const locked = folder('f', null, { isLocked: true, passwordHash: 'hash' });

    it('accepts a fresh token', () => {
      const { service } = setup([]);
      expect(
        service.verifyUnlockToken(locked, service.generateUnlockToken(locked)),
      ).toBe(true);
    });

    it('rejects tampered, expired and password-changed tokens', () => {
      const { service } = setup([]);
      const token = service.generateUnlockToken(locked);

      expect(service.verifyUnlockToken(locked, token.slice(0, -1) + '0')).toBe(
        false,
      );
      expect(
        service.verifyUnlockToken({ ...locked, passwordHash: 'new' }, token),
      ).toBe(false);
      expect(service.verifyUnlockToken(locked, undefined)).toBe(false);

      const [, signature] = token.split('.');
      expect(service.verifyUnlockToken(locked, `1.${signature}`)).toBe(false);
    });
  });
});
