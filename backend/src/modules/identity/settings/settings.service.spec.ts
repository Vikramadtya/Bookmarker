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
    await service.importFromHtml(
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
