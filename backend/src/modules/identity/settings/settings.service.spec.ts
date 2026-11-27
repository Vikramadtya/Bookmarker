import { SettingsService } from './settings.service';

function setup() {
  const folders = [
    { id: 'inbox', name: 'Inbox', parentId: null, isInbox: true },
    { id: 'f1', name: '<b>Work</b>', parentId: null, isInbox: false },
  ];
  const bookmarks = [
    {
      id: 'b1',
      folderId: 'f1',
      title: '<script>alert(1)</script>',
      bookmarkURL: 'https://x.com/?a=1&b="2"',
      description: '',
      tags: [],
      comments: [],
    },
  ];
  const foldersService = {
    getAllFolders: jest.fn().mockResolvedValue(folders),
    getInbox: jest.fn().mockResolvedValue(folders[0]),
    createFolder: jest.fn(async (_u, dto) => ({
      id: `new-${dto.name}`,
      ...dto,
    })),
  } as any;
  const bookmarksService = {
    getAll: jest.fn().mockResolvedValue(bookmarks),
    importBookmarks: jest.fn(async (_u, items) => ({
      imported: items.length,
      skipped: 0,
    })),
  } as any;
  return {
    service: new SettingsService(bookmarksService, foldersService),
    foldersService,
    bookmarksService,
  };
}

describe('SettingsService', () => {
  it('escapes user-controlled text in the export', async () => {
    const html = await setup().service.exportToHtml('u');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Work&lt;/b&gt;');
    expect(html).toContain('a=1&amp;b=&quot;2&quot;');
  });

  it('imports only http(s) links, nested under their folders', async () => {
    const { service, bookmarksService } = setup();
    await service.importData(
      'u',
      `<DL><p>
        <DT><H3>Dev</H3><DL><p>
          <DT><A HREF="https://a.com">A</A>
          <DT><A HREF="file:///etc/passwd">bad</A>
          <DT><A HREF="javascript:alert(1)">bad</A>
        </DL><p>
        <DT><A HREF="http://169.254.169.254/x">top</A>
      </DL>`,
    );
    const items = bookmarksService.importBookmarks.mock.calls[0][1];
    expect(items.map((i: any) => [i.bookmarkURL, i.folderId])).toEqual([
      ['https://a.com/', 'new-Dev'],
      ['http://169.254.169.254/x', 'inbox'], // stored, but the scraper refuses to fetch it
    ]);
  });
});

describe('SettingsService folder export', () => {
  const tree = [
    { id: 'a', name: 'Study', parentId: null },
    { id: 'b', name: 'Java', parentId: 'a' },
    { id: 'c', name: 'Deep', parentId: 'b' },
    { id: 'v', name: 'Vault', parentId: 'a', isLocked: true },
    { id: 'w', name: 'Inside', parentId: 'v' },
    { id: 'o', name: 'Other', parentId: null },
  ];
  const rows = tree.map((f) => ({
    id: `b-${f.id}`,
    folderId: f.id,
    title: `in ${f.name}`,
    bookmarkURL: `https://x.com/${f.id}`,
    description: '',
    tags: [],
    comments: [],
    creationDate: new Date(0),
    isFavorite: false,
    status: 'unread',
  }));
  const build = () => {
    const folders = {
      getAllFolders: jest.fn().mockResolvedValue(tree),
      getFolderById: jest.fn(async (_u, id) => tree.find((f) => f.id === id)),
      assertUnlocked: jest.fn(),
    } as any;
    const bookmarks = { getAll: jest.fn().mockResolvedValue(rows) } as any;
    return { service: new SettingsService(bookmarks, folders), folders };
  };

  it('includes subfolders but not locked ones or their contents', async () => {
    const out = JSON.parse(await build().service.exportToJson('u', 'a'));
    expect(out.map((r: any) => r.folder)).toEqual([
      'Study',
      'Study/Java',
      'Study/Java/Deep',
    ]);
  });

  it('writes a CSV of only that folder', async () => {
    const csv = await build().service.exportToCsv('u', 'b');
    expect(csv.split('\n')).toHaveLength(3); // header and two rows
    expect(csv).not.toContain('in Other');
  });

  it('refuses a locked folder without its token', async () => {
    const { service, folders } = build();
    folders.assertUnlocked.mockImplementation(() => {
      throw new Error('locked');
    });
    await expect(service.exportToJson('u', 'v')).rejects.toThrow('locked');
  });

  it('still exports everything without a folder', async () => {
    const out = JSON.parse(await build().service.exportToJson('u'));
    expect(out).toHaveLength(rows.length);
  });
});
