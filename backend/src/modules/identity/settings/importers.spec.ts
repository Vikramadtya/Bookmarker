import { parseCsv, parseHtml, parseImport, parseJson } from './importers';

describe('importers', () => {
  it('reads Netscape HTML with folders, tags and notes, dropping unsafe links', () => {
    const items = parseHtml(`<DL><p>
      <DT><H3>Dev</H3><DL><p>
        <DT><A HREF="https://a.com" TAGS="rust,web">A</A>
        <DD>about a
        <DT><A HREF="javascript:alert(1)">bad</A>
      </DL><p>
      <DT><A HREF="https://top.com">top</A>
    </DL>`);
    expect(items.map((i) => [i.bookmarkURL, i.folderPath, i.tags])).toEqual([
      ['https://a.com/', ['Dev'], ['rust', 'web']],
      ['https://top.com/', [], []],
    ]);
    expect(items[0].description).toBe('about a');
  });

  it('reads a Pocket list and marks the unread section', () => {
    const items =
      parseHtml(`<h1>Unread</h1><ul><li><a href="https://u.com" tags="x">U</a></li></ul>
      <h1>Read Archive</h1><ul><li><a href="https://r.com">R</a></li></ul>`);
    expect(items.map((i) => i.status)).toEqual(['unread', 'done']);
  });

  it('reads Pinboard JSON', () => {
    const items = parseJson(
      JSON.stringify([
        {
          href: 'https://p.com',
          description: 'P',
          extended: 'notes',
          tags: 'a b',
          toread: 'yes',
        },
      ]),
    );
    expect(items[0]).toMatchObject({
      title: 'P',
      description: 'notes',
      tags: ['a', 'b'],
      status: 'unread',
    });
  });

  it('reads Raindrop-style CSV with quoted fields', () => {
    const items = parseCsv(
      'title,url,folder,tags,favorite\n"Hello, world",https://r.com,Work/Reading,"a, b",true\n',
    );
    expect(items[0]).toMatchObject({
      title: 'Hello, world',
      folderPath: ['Work', 'Reading'],
      tags: ['a', 'b'],
      isFavorite: true,
    });
  });

  it('detects the format from the content', () => {
    expect(parseImport('[{"url":"https://j.com"}]')).toHaveLength(1);
    expect(parseImport('url,title\nhttps://c.com,C')).toHaveLength(1);
    expect(
      parseImport('<DL><DT><A HREF="https://h.com">h</A></DL>'),
    ).toHaveLength(1);
  });
});
