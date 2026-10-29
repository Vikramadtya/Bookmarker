import { BadRequestException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from '../../domain/entities/bookmark.entity';

const bookmark = (id: string, minutesAgo: number): Bookmark =>
  ({
    id,
    creationDate: new Date(Date.now() - minutesAgo * 60_000),
  }) as Bookmark;

function setup(rows: Bookmark[] = []) {
  const repo = { find: jest.fn().mockResolvedValue(rows) } as any;
  const agenda = { now: jest.fn() } as any;
  return { service: new BookmarksService(repo, agenda), repo };
}

describe('BookmarksService.listBookmarks', () => {
  it('scopes every query to the user', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('a@x.com', {});
    expect(repo.find).toHaveBeenCalledWith(
      { userId: 'a@x.com' },
      { limit: 51 },
    );
  });

  it('returns a cursor only when more rows exist', async () => {
    const rows = [bookmark('3', 1), bookmark('2', 2), bookmark('1', 3)];
    const { service } = setup(rows);

    const page = await service.listBookmarks('u', { limit: 2 });
    expect(page.items.map((b) => b.id)).toEqual(['3', '2']);
    expect(page.nextCursor).not.toBeNull();

    const last = await setup(rows.slice(0, 2)).service.listBookmarks('u', {
      limit: 2,
    });
    expect(last.nextCursor).toBeNull();
  });

  it('feeds the cursor back as a keyset condition', async () => {
    const { service, repo } = setup([bookmark('2', 1), bookmark('1', 2)]);
    const { nextCursor } = await service.listBookmarks('u', { limit: 1 });

    await service.listBookmarks('u', { cursor: nextCursor! });
    const filter = repo.find.mock.calls[1][0];
    expect(JSON.stringify(filter.$and[0].$or[0])).toContain('createdAt');
  });

  it('rejects a malformed cursor', async () => {
    const { service } = setup();
    await expect(
      service.listBookmarks('u', { cursor: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('escapes regex characters and only searches allowed fields', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', {
      q: 'a.b(',
      fields: 'title,password,notes',
    });

    const or = repo.find.mock.calls[0][0].$and[0].$or;
    const fields = or.map((clause: object) => Object.keys(clause)[0]);
    expect(fields).toEqual(['title', 'comments', 'bookmarkURL']);
    expect(or[0].title.$regex).toBe('a\\.b\\(');
  });

  it('splits multi-folder ids into $in', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', { folderId: 'f1,f2' });
    expect(repo.find.mock.calls[0][0].$and[0]).toEqual({
      folderId: { $in: ['f1', 'f2'] },
    });
  });
});
