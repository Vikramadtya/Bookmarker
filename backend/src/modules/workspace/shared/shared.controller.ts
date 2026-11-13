import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  Header,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { UsersService } from '@identity/users/application/services/users.service';
import { getFrontendUrl } from '@core/config/app.config';

const esc = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Public, unauthenticated read-only access to folders their owners have shared. */
@ApiTags('shared')
@Controller('api/v1/shared')
export class SharedController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly bookmarksService: BookmarksService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  /** Folder info plus its bookmarks; `bookmarks` is null while the folder is locked. */
  @Get(':username/:slug')
  async getPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Headers('x-folder-token') folderToken?: string,
  ) {
    const folder = await this.resolveFolder(username, slug);
    const unlocked =
      !folder.isLocked ||
      this.foldersService.verifyUnlockToken(folder, folderToken);

    const bookmarks = unlocked
      ? (await this.bookmarksService.getAll(folder.userId, folder.id)).map(
          (b) => ({
            id: b.id,
            title: b.title,
            bookmarkURL: b.bookmarkURL,
            description: b.description,
            logoURL: b.logoURL,
            imageURL: b.imageURL,
            tags: b.tags,
            creationDate: b.creationDate,
          }),
        )
      : null;

    return {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      isLocked: folder.isLocked,
      bookmarks,
    };
  }

  /** RSS feed of a public collection; locked collections have none. */
  @Get(':username/:slug/rss')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=900')
  async rss(@Param('username') username: string, @Param('slug') slug: string) {
    const folder = await this.resolveFolder(username, slug);
    if (folder.isLocked)
      throw new ForbiddenException('This collection is locked');
    const bookmarks = (
      await this.bookmarksService.getAll(folder.userId, folder.id)
    ).slice(0, 50);
    const page = `${getFrontendUrl(this.config)}/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

    const items = bookmarks
      .map(
        (b) =>
          `<item><title>${esc(b.title || b.bookmarkURL)}</title><link>${esc(b.bookmarkURL)}</link>` +
          `<guid isPermaLink="false">${esc(b.id)}</guid><pubDate>${new Date(b.creationDate).toUTCString()}</pubDate>` +
          `<description>${esc(b.description || '')}</description></item>`,
      )
      .join('');
    return (
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>` +
      `<title>${esc(folder.name)}</title><link>${esc(page)}</link>` +
      `<description>${esc(`${folder.name}, shared by ${username}`)}</description>${items}</channel></rss>`
    );
  }

  @Post(':username/:slug/unlock')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async unlockPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Body('password') password?: string,
  ) {
    const folder = await this.resolveFolder(username, slug);
    if (!(await this.foldersService.verifyPassword(folder, password))) {
      throw new ForbiddenException('Invalid folder password');
    }
    return { token: this.foldersService.generateUnlockToken(folder) };
  }

  private async resolveFolder(username: string, slug: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('Folder not found');
    return this.foldersService.getPublicFolderBySlug(user.email, slug);
  }
}

/**
 * Link-preview page for shared collections. Crawlers (Slack, Twitter, iMessage...)
 * do not run the single-page app, so they read these tags; people are sent on
 * to the real page immediately.
 */
@ApiTags('shared')
@Controller('share')
export class ShareLandingController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly bookmarksService: BookmarksService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Get(':username/:slug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async page(@Param('username') username: string, @Param('slug') slug: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('Collection not found');
    const folder = await this.foldersService.getPublicFolderBySlug(
      user.email,
      slug,
    );

    const app = getFrontendUrl(this.config);
    const target = `${app}/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
    // A locked collection reveals nothing beyond its name.
    const bookmarks = folder.isLocked
      ? []
      : await this.bookmarksService.getAll(folder.userId, folder.id);
    const image = bookmarks.find((b) => b.imageURL)?.imageURL ?? '';
    const description = folder.isLocked
      ? 'A password-protected collection.'
      : `${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'}, shared by ${username}`;
    const title = `${folder.name} · Bookmarker`;

    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(folder.name)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(target)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="alternate" type="application/rss+xml" title="${esc(folder.name)}" href="${esc(`${this.config.get('PUBLIC_API_URL') || ''}/api/v1/shared/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/rss`)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}"></head>
<body><p><a href="${esc(target)}">Open ${esc(folder.name)}</a></p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  }
}
