import { BadRequestException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from '../../domain/entities/bookmark.entity';

const bookmark = (id: string, minutesAgo: number, extra = {}): Bookmark =>
  ({
    id,
    title: `t${id}`,
    domain: 'a.com',
    position: 0,
    lastOpenedAt: new Date(),
    creationDate: new Date(Date.now() - minutesAgo * 60_000),
    ...extra,
  }) as Bookmark;

function setup(rows: Bookmark[] = []) {
  const repo = {
    find: jest.fn().mockResolvedValue(rows),
    findDuplicateGroups: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  } as any;
  const agenda = { now: jest.fn() } as any;
  return { service: new BookmarksService(repo, agenda), repo };
}

const filterOf = (repo: any, call = 0) => repo.find.mock.calls[call][0];
const clauses = (repo: any, call = 0) => filterOf(repo, call).$and;

describe('BookmarksService.listBookmarks', () => {
  it('scopes every query to the user and hides archived bookmarks', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('a@x.com', {});
    expect(filterOf(repo).userId).toBe('a@x.com');
    expect(clauses(repo)).toContainEqual({ status: { $ne: 'archived' } });
    expect(repo.find.mock.calls[0][1]).toMatchObject({ limit: 51 });
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

  it('feeds the cursor back as a keyset condition on the sort field', async () => {
    const { service, repo } = setup([bookmark('2', 1), bookmark('1', 2)]);
    const { nextCursor } = await service.listBookmarks('u', { limit: 1 });

    await service.listBookmarks('u', { cursor: nextCursor! });
    const keyset = clauses(repo, 1).find((c: any) => c.$or?.[0]?.createdAt);
    expect(keyset.$or[0].createdAt.$lt).toBeInstanceOf(Date);
  });

  it('ties a cursor to the sort it was issued for', async () => {
    const { service } = setup([bookmark('2', 1), bookmark('1', 2)]);
    const { nextCursor } = await service.listBookmarks('u', { limit: 1 });
    await expect(
      service.listBookmarks('u', { cursor: nextCursor!, sort: 'title' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sorts by title case-insensitively with an id tie-break', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', { sort: 'title' });
    expect(repo.find.mock.calls[0][1]).toMatchObject({
      sort: { title: 1, _id: 1 },
      caseInsensitive: true,
    });
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

    const search = clauses(repo).find((c: any) => c.$or?.[0]?.title);
    const fields = search.$or.map((clause: object) => Object.keys(clause)[0]);
    expect(fields).toEqual(['title', 'comments', 'bookmarkURL']);
    expect(search.$or[0].title.$regex).toBe('a\\.b\\(');
  });

  it('splits multi-folder ids into $in', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', { folderId: 'f1,f2' });
    expect(clauses(repo)).toContainEqual({ folderId: { $in: ['f1', 'f2'] } });
  });

  it('turns search operators into filters', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', {
      q: 'rust tag:dev site:github.com is:unread is:dead saved:7d',
    });
    const all = JSON.stringify(clauses(repo));
    expect(all).toContain('"status":"unread"');
    expect(all).toContain('"isDeadLink":true');
    expect(all).toContain('github');
    expect(all).toContain('"tags":"dev"'); // exact tag, plus nested via regex
    expect(all).toContain('"createdAt":{"$gte"');
    expect(all).not.toContain('$ne":"archived');
  });

  it('serves the triage queue oldest first, skipping snoozed items', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', { triage: 'true' });
    expect(repo.find.mock.calls[0][1].sort).toEqual({ createdAt: 1, _id: 1 });
    expect(JSON.stringify(clauses(repo))).toContain('snoozedUntil');
  });

  it('treats legacy bookmarks without a status as done', async () => {
    const { service, repo } = setup();
    await service.listBookmarks('u', { q: 'is:done' });
    expect(JSON.stringify(clauses(repo))).toContain('"$exists":false');
  });

  it('adds a snippet when article text is searched', async () => {
    const rows = [bookmark('1', 1)];
    const { service, repo } = setup(rows);
    repo.find
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([
        {
          id: '1',
          content: '<p>The borrow checker explains ownership well.</p>',
        },
      ]);
    const page = await service.listBookmarks('u', {
      q: 'ownership',
      fields: 'content',
    });
    expect(page.items[0].snippet).toContain('ownership');
  });
});
