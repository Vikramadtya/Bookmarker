import { Injectable } from '@nestjs/common';
import {
  BookmarksService,
  ImportItem,
} from '@content/bookmarks/application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { MAX_IMPORT_FOLDERS, parseImport } from './importers';

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

  /** Rows for the JSON and CSV exports, with each bookmark's folder as a path. */
  private async exportRows(userId: string, only?: Set<string>) {
    const [folders, all] = await Promise.all([
      this.foldersService.getAllFolders(userId),
      this.bookmarksService.getAll(userId),
    ]);
    const bookmarks = only ? all.filter((b) => only.has(b.folderId)) : all;
    const byId = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (id: string) => {
      const names: string[] = [];
      for (
        let f = byId.get(id);
        f;
        f = f.parentId ? byId.get(f.parentId) : undefined
      )
        names.unshift(f.name);
      return names.join('/');
    };
    return bookmarks.map((b) => ({
      url: b.bookmarkURL,
      title: b.title,
      description: b.description,
      tags: b.tags,
      folder: pathOf(b.folderId),
      favorite: b.isFavorite,
      status: b.status,
      saved: new Date(b.creationDate).toISOString(),
      notes: b.comments,
    }));
  }

  /**
   * The ids of a folder and everything inside it. The folder itself must be
   * unlocked; locked folders inside it are left out, along with their contents.
   */
  private async folderScope(
    userId: string,
    folderId: string,
    folderToken?: string,
  ): Promise<Set<string>> {
    const root = await this.foldersService.getFolderById(userId, folderId);
    this.foldersService.assertUnlocked(root, folderToken);
    const folders = await this.foldersService.getAllFolders(userId);
    const scope = new Set([root.id]);
    // A Set grows while it is iterated, so this walks the whole subtree.
    for (const id of scope)
      for (const f of folders)
        if (f.parentId === id && !f.isLocked) scope.add(f.id);
    return scope;
  }

  /** Everything, or just one folder (with its subfolders). */
  async exportToJson(
    userId: string,
    folderId?: string,
    folderToken?: string,
  ): Promise<string> {
    const only = folderId
      ? await this.folderScope(userId, folderId, folderToken)
      : undefined;
    return JSON.stringify(await this.exportRows(userId, only), null, 2);
  }

  async exportToCsv(
    userId: string,
    folderId?: string,
    folderToken?: string,
  ): Promise<string> {
    const only = folderId
      ? await this.folderScope(userId, folderId, folderToken)
      : undefined;
    const rows = await this.exportRows(userId, only);
    const header =
      'title,url,description,tags,folder,favorite,status,saved,notes';
    const lines = rows.map((r) =>
      [
        r.title,
        r.url,
        r.description,
        r.tags.join(', '),
        r.folder,
        String(r.favorite),
        r.status,
        r.saved,
        r.notes.join(' | '),
      ]
        .map(csvCell)
        .join(','),
    );
    return [header, ...lines].join('\n');
  }

  /** Imports HTML (browsers, Raindrop, Pinboard, Pocket), JSON (Pinboard, this app) or CSV. */
  async importData(userId: string, content: string) {
    const parsed = parseImport(content);
    const inboxId = (await this.foldersService.getInbox(userId)).id;
    const folderIds = await this.folderResolver(userId, inboxId);

    const items: ImportItem[] = [];
    for (const entry of parsed) {
      const folderId = await folderIds(entry.folderPath);
      items.push({
        bookmarkURL: entry.bookmarkURL,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
        comments: entry.comments,
        isFavorite: entry.isFavorite,
        status: entry.status,
        folderId,
      });
    }

    const { imported, skipped } = await this.bookmarksService.importBookmarks(
      userId,
      items,
    );
    return { success: true, imported, skipped };
  }

  /** Maps a folder path ("Work/Reading") to an id, creating folders that do not exist yet. */
  private async folderResolver(userId: string, inboxId: string) {
    const existing = await this.foldersService.getAllFolders(userId);
    const byId = new Map(existing.map((f) => [f.id, f]));
    const known = new Map<string, string>();
    for (const f of existing) {
      const names: string[] = [];
      for (
        let cur: typeof f | undefined = f;
        cur;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      )
        names.unshift(cur.name);
      if (!f.isInbox) known.set(names.join('/').toLowerCase(), f.id);
    }
    let created = 0;

    return async (path: string[]): Promise<string> => {
      let parentId: string | undefined;
      let key = '';
      for (const name of path) {
        key = key ? `${key}/${name}` : name;
        const lower = key.toLowerCase();
        let id = known.get(lower);
        if (!id) {
          if (created >= MAX_IMPORT_FOLDERS) return parentId ?? inboxId;
          created++;
          id = (
            await this.foldersService.createFolder(userId, { name, parentId })
          ).id;
          known.set(lower, id);
        }
        parentId = id;
      }
      return parentId ?? inboxId;
    };
  }
}
