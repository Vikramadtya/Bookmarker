import { Injectable, Logger } from '@nestjs/common';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { FoldersService } from '../folders/folders.service';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly bookmarksService: BookmarksService,
    private readonly foldersService: FoldersService,
  ) {}

  async deleteAllData(userId: string) {
    const folders = await this.foldersService.getAllFolders(userId);
    const bookmarks = await this.bookmarksService.getBookmarks(userId);

    const bookmarkIds = bookmarks.map((b) => b.id);
    if (bookmarkIds.length > 0) {
      await this.bookmarksService.bulkDelete(userId, bookmarkIds);
    }

    for (const folder of folders) {
      try {
        await this.foldersService.deleteFolder(userId, folder.id);
      } catch (e) {}
    }
  }

  async exportToHtml(userId: string): Promise<string> {
    const folders = await this.foldersService.getAllFolders(userId);
    const bookmarks = await this.bookmarksService.getBookmarks(userId);

    const buildFolderTree = (parentId: string | null) => {
      const children = folders.filter((f) => f.parentId === parentId);
      let html = '';
      for (const child of children) {
        html += `<DT><H3>${child.name}</H3>\n`;
        html += `<DL><p>\n`;

        const childBookmarks = bookmarks.filter((b) => b.folderId === child.id);
        for (const b of childBookmarks) {
          html += `<DT><A HREF="${b.bookmarkURL}">${b.title || 'Untitled'}</A>\n`;
          if (b.description || b.tags?.length || b.comments?.length) {
            html += `<DD>${b.description || ''} ${b.tags?.join(', ')} ${b.comments?.join(' ')}\n`;
          }
        }

        html += buildFolderTree(child.id);
        html += `</DL><p>\n`;
      }
      return html;
    };

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

    const rootBookmarks = bookmarks.filter(
      (b) => b.folderId === 'root' || !b.folderId,
    );
    for (const b of rootBookmarks) {
      html += `<DT><A HREF="${b.bookmarkURL}">${b.title || 'Untitled'}</A>\n`;
      if (b.description || b.tags?.length || b.comments?.length) {
        html += `<DD>${b.description || ''}\n`;
      }
    }

    html += buildFolderTree(null);
    html += `</DL><p>`;
    return html;
  }

  async importFromHtml(userId: string, htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    const rootDl = $('dl').first();

    const processDl = async (
      dlElement: any,
      currentParentId: string | undefined = undefined,
    ) => {
      const dtElements = $(dlElement).children('dt');

      for (const dt of dtElements) {
        const h3 = $(dt).children('h3').first();
        const a = $(dt).children('a').first();

        if (h3.length > 0) {
          const folderName = h3.text().trim();
          const newFolder = await this.foldersService.createFolder(userId, {
            name: folderName,
            parentId: currentParentId,
          });

          const childDl = $(dt).next('dl');
          if (childDl.length > 0) {
            await processDl(childDl[0], newFolder.id);
          } else {
            const innerDl = $(dt).children('dl').first();
            if (innerDl.length > 0) {
              await processDl(innerDl[0], newFolder.id);
            }
          }
        } else if (a.length > 0) {
          const title = a.text().trim();
          const url = a.attr('href');

          if (url) {
            try {
              let targetFolderId = currentParentId;
              if (!targetFolderId) {
                const folders = await this.foldersService.getAllFolders(userId);
                let inbox = folders.find(
                  (f) => f.name === 'Inbox' && !f.parentId,
                );
                if (!inbox) {
                  inbox = await this.foldersService.createFolder(userId, {
                    name: 'Inbox',
                  });
                }
                targetFolderId = inbox.id;
              }

              await this.bookmarksService.createBookmark(userId, {
                bookmarkURL: url,
                title: title,
                folderId: targetFolderId,
              });
            } catch (err) {
              this.logger.warn(
                `Failed to import bookmark ${url}: ${err.message}`,
              );
            }
          }
        }
      }
    };

    if (rootDl.length > 0) {
      await processDl(rootDl[0], undefined);
    }
    return { success: true };
  }
}
