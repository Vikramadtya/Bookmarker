import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  BookmarksService,
  ImportItem,
} from '@content/bookmarks/application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';

const MAX_IMPORT_FOLDERS = 500;
const MAX_IMPORT_BOOKMARKS = 5000;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function toHttpUrl(raw: string | undefined): string | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly bookmarksService: BookmarksService,
    private readonly foldersService: FoldersService,
  ) {}

  async deleteAllData(userId: string) {
    await this.bookmarksService.deleteAll(userId);
    await this.foldersService.deleteAllByUser(userId);
  }

  async exportToHtml(userId: string): Promise<string> {
    const [folders, bookmarks] = await Promise.all([
      this.foldersService.getAllFolders(userId),
      this.bookmarksService.getAll(userId),
    ]);

    const bookmarksByFolder = new Map<string, typeof bookmarks>();
    for (const b of bookmarks) {
      bookmarksByFolder.set(b.folderId, [
        ...(bookmarksByFolder.get(b.folderId) ?? []),
        b,
      ]);
    }
    const foldersByParent = new Map<string | null, typeof folders>();
    for (const f of folders) {
      foldersByParent.set(f.parentId, [
        ...(foldersByParent.get(f.parentId) ?? []),
        f,
      ]);
    }

    const renderBookmark = (b: (typeof bookmarks)[number]) => {
      let out = `<DT><A HREF="${escapeHtml(b.bookmarkURL)}">${escapeHtml(b.title || 'Untitled')}</A>\n`;
      const notes = [
        b.description,
        b.tags.join(', '),
        b.comments.join(' '),
      ].filter(Boolean);
      if (notes.length > 0) out += `<DD>${escapeHtml(notes.join(' '))}\n`;
      return out;
    };

    const renderFolders = (parentId: string | null): string =>
      (foldersByParent.get(parentId) ?? [])
        .map(
          (folder) =>
            `<DT><H3>${escapeHtml(folder.name)}</H3>\n<DL><p>\n` +
            (bookmarksByFolder.get(folder.id) ?? [])
              .map(renderBookmark)
              .join('') +
            renderFolders(folder.id) +
            `</DL><p>\n`,
        )
        .join('');

    const known = new Set(folders.map((f) => f.id));
    const orphans = bookmarks.filter((b) => !known.has(b.folderId));

    return (
      `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n` +
      `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n` +
      `<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n` +
      orphans.map(renderBookmark).join('') +
      renderFolders(null) +
      `</DL><p>`
    );
  }

  async importFromHtml(userId: string, htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    const inboxId = (await this.foldersService.getInbox(userId)).id;

    const items: ImportItem[] = [];
    let folderCount = 0;

    const walk = async (dl: any, parentId: string | undefined) => {
      for (const dt of $(dl).children('dt').toArray()) {
        const heading = $(dt).children('h3').first();
        const link = $(dt).children('a').first();

        if (heading.length > 0) {
          if (++folderCount > MAX_IMPORT_FOLDERS) continue;
          const folder = await this.foldersService.createFolder(userId, {
            name: heading.text().trim().slice(0, 100) || 'Untitled',
            parentId,
          });
          const childList = $(dt).next('dl');
          const nested =
            childList.length > 0 ? childList : $(dt).children('dl').first();
          if (nested.length > 0) await walk(nested[0], folder.id);
        } else if (link.length > 0 && items.length < MAX_IMPORT_BOOKMARKS) {
          const bookmarkURL = toHttpUrl(link.attr('href'));
          if (bookmarkURL) {
            items.push({
              bookmarkURL,
              title: link.text().trim().slice(0, 500),
              folderId: parentId ?? inboxId,
            });
          }
        }
      }
    };

    const root = $('dl').first();
    if (root.length > 0) await walk(root[0], undefined);

    const { imported, skipped } = await this.bookmarksService.importBookmarks(
      userId,
      items,
    );
    return { success: true, imported, skipped };
  }
}
