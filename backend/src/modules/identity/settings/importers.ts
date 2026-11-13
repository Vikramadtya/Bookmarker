import * as cheerio from 'cheerio';

/**
 * Parsers for bookmark exports. Everything is turned into plain items with a
 * folder path; creating folders and saving happens elsewhere.
 *
 * Supported: browser/Raindrop/Pinboard/Pocket HTML (Netscape format and Pocket's
 * list), Pinboard JSON, this app's own JSON, and CSV (Raindrop, Pocket, generic).
 */
export interface ParsedItem {
  bookmarkURL: string;
  title: string;
  description: string;
  tags: string[];
  comments: string[];
  folderPath: string[];
  isFavorite: boolean;
  status?: 'unread' | 'done';
}

export const MAX_IMPORT_FOLDERS = 500;
export const MAX_IMPORT_BOOKMARKS = 5000;

export function toHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export function splitTags(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,;]|\s+/)
      : [];
  return [...new Set(list.map((t) => clean(t, 50)).filter(Boolean))].slice(
    0,
    20,
  );
}

const folderPathOf = (raw: unknown) =>
  clean(raw, 400)
    .split('/')
    .map((p) => clean(p, 100))
    .filter(Boolean);

function item(
  partial: Partial<ParsedItem> & { url: unknown },
): ParsedItem | null {
  const bookmarkURL = toHttpUrl(partial.url);
  if (!bookmarkURL) return null;
  return {
    bookmarkURL,
    title: clean(partial.title, 500),
    description: clean(partial.description, 2000),
    tags: partial.tags ?? [],
    comments: partial.comments ?? [],
    folderPath: partial.folderPath ?? [],
    isFavorite: partial.isFavorite ?? false,
    status: partial.status,
  };
}

// ─── HTML ────────────────────────────────────────────────────────────────────

export function parseHtml(html: string): ParsedItem[] {
  const $ = cheerio.load(html);
  const items: ParsedItem[] = [];

  const walk = (dl: any, path: string[]) => {
    for (const dt of $(dl).children('dt').toArray()) {
      const heading = $(dt).children('h3').first();
      const link = $(dt).children('a').first();

      if (heading.length > 0) {
        const childList = $(dt).next('dl');
        const nested =
          childList.length > 0 ? childList : $(dt).children('dl').first();
        const name = clean(heading.text(), 100) || 'Untitled';
        if (nested.length > 0) walk(nested[0], [...path, name]);
      } else if (link.length > 0) {
        const note = $(dt).next('dd').text();
        const parsed = item({
          url: link.attr('href'),
          title: link.text(),
          description: note,
          tags: splitTags(link.attr('tags')),
          folderPath: path,
        });
        if (parsed) items.push(parsed);
      }
    }
  };

  const root = $('dl').first();
  if (root.length > 0) walk(root[0], []);

  // Pocket exports a plain list: <h1>Unread</h1><ul><li><a href tags>…
  if (items.length === 0) {
    $('ul').each((_i, ul) => {
      const heading = $(ul).prevAll('h1,h2,h3').first().text().toLowerCase();
      const status = heading.includes('unread') ? 'unread' : 'done';
      $(ul)
        .find('a[href]')
        .each((_j, a) => {
          const parsed = item({
            url: $(a).attr('href'),
            title: $(a).text(),
            tags: splitTags($(a).attr('tags')),
            status,
          });
          if (parsed) items.push(parsed);
        });
    });
  }
  return items;
}

// ─── JSON ────────────────────────────────────────────────────────────────────

export function parseJson(text: string): ParsedItem[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.bookmarks)
      ? (data as any).bookmarks
      : [];

  return rows.flatMap((row: any) => {
    // Pinboard: href/description(title)/extended(notes)/tags(space separated)/toread
    const pinboard = row.href !== undefined;
    const parsed = item({
      url: row.href ?? row.url,
      title: pinboard ? row.description : row.title,
      description: pinboard ? row.extended : row.description,
      tags: splitTags(row.tags),
      comments: Array.isArray(row.notes)
        ? row.notes.map((n: unknown) => clean(n, 5000)).filter(Boolean)
        : [],
      folderPath: folderPathOf(row.folder),
      isFavorite: row.favorite === true || row.favorite === 'true',
      status:
        row.toread === 'yes' || row.status === 'unread' ? 'unread' : undefined,
    });
    return parsed ? [parsed] : [];
  });
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

export function parseCsv(text: string): ParsedItem[] {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ''));
  if (!header) return [];
  const col = (...names: string[]) =>
    header.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const at = {
    url: col('url', 'href', 'link'),
    title: col('title', 'name'),
    note: col('note', 'notes', 'excerpt', 'description', 'extended'),
    tags: col('tags'),
    folder: col('folder', 'collection'),
    favorite: col('favorite', 'favourite', 'starred'),
    status: col('status'),
  };
  if (at.url === -1) return [];
  const cell = (r: string[], i: number) => (i === -1 ? '' : (r[i] ?? ''));

  return rows.flatMap((r) => {
    const status = cell(r, at.status).toLowerCase();
    const parsed = item({
      url: cell(r, at.url),
      title: cell(r, at.title),
      description: cell(r, at.note),
      tags: splitTags(cell(r, at.tags)),
      folderPath: folderPathOf(cell(r, at.folder)),
      isFavorite: ['true', 'yes', '1'].includes(
        cell(r, at.favorite).toLowerCase(),
      ),
      status: status === 'unread' ? 'unread' : undefined,
    });
    return parsed ? [parsed] : [];
  });
}

/** Picks the parser from the content itself. */
export function parseImport(content: string): ParsedItem[] {
  const head = content.trimStart().slice(0, 200).toLowerCase();
  const parsed =
    head.startsWith('[') || head.startsWith('{')
      ? parseJson(content)
      : head.startsWith('<') ||
          head.includes('<dl') ||
          head.includes('<!doctype')
        ? parseHtml(content)
        : parseCsv(content);
  return parsed.slice(0, MAX_IMPORT_BOOKMARKS);
}
