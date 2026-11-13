import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { Preferences } from './preferences.schema';
import { toHttpUrl } from '../settings/importers';

const MAX_LINKS = 20;
const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

/** Fields the common inbound-email providers (Postmark, Mailgun, SendGrid, ...) use for the body. */
const BODY_FIELDS = [
  'TextBody',
  'HtmlBody',
  'text',
  'html',
  'plain',
  'body-plain',
  'stripped-text',
  'Subject',
  'subject',
];

/**
 * Email-to-save: point an inbound-email webhook at
 *   POST /api/v1/inbound/email?token=<your token>
 * and every link in a forwarded email lands in your Inbox. The token is the
 * only credential, so it is long, rotatable, and the route is rate limited.
 */
@ApiTags('inbound')
@Controller('api/v1/inbound')
export class InboundController {
  constructor(
    @InjectModel(Preferences.name) private readonly prefs: Model<Preferences>,
    private readonly bookmarks: BookmarksService,
    private readonly folders: FoldersService,
  ) {}

  private async ownerOf(token: string | undefined) {
    const owner =
      token && /^[a-f0-9]{48}$/.test(token)
        ? await this.prefs.findOne({ captureToken: token }).lean().exec()
        : null;
    // Same answer for "no such token" and "bad token" so tokens cannot be probed.
    if (!owner) throw new NotFoundException();
    return owner;
  }

  /** Folders a browser extension may save into (locked ones are left out). */
  @Get('folders')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async listFolders(@Query('token') token: string | undefined) {
    const owner = await this.ownerOf(token);
    const folders = await this.folders.getAllFolders(owner.userId);
    return folders
      .filter((f) => !f.isLocked)
      .map((f) => ({ id: f.id, name: f.name, isInbox: !!f.isInbox }));
  }

  /** Saves one link for the browser extensions, which cannot rely on cookies in Safari. */
  @Post('save')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async save(
    @Query('token') token: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const owner = await this.ownerOf(token);
    const bookmarkURL =
      typeof body?.bookmarkURL === 'string'
        ? toHttpUrl(body.bookmarkURL)
        : null;
    if (!bookmarkURL) throw new BadRequestException('A web address is needed');
    const folders = await this.folders.getAllFolders(owner.userId);
    const folder =
      folders.find((f) => f.id === body.folderId && !f.isLocked) ??
      folders.find((f) => f.isInbox) ??
      folders[0];
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const bookmark = await this.bookmarks.createBookmark(owner.userId, {
      bookmarkURL,
      folderId: folder.id,
      title:
        typeof body.title === 'string' ? body.title.slice(0, 300) : undefined,
      tags,
    } as never);
    return { id: bookmark.id };
  }

  @Post('email')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async receive(
    @Query('token') token: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const owner = await this.ownerOf(token);

    const text = BODY_FIELDS.map((f) =>
      typeof body?.[f] === 'string' ? (body[f] as string) : '',
    ).join('\n');
    const urls = [...new Set(text.match(URL_PATTERN) ?? [])]
      .map((u) => toHttpUrl(u.replace(/[.,;]+$/, '')))
      .filter((u): u is string => !!u)
      .slice(0, MAX_LINKS);

    const inbox = await this.folders.getInbox(owner.userId);
    let saved = 0;
    for (const bookmarkURL of urls) {
      await this.bookmarks.createBookmark(owner.userId, {
        bookmarkURL,
        folderId: inbox.id,
      });
      saved++;
    }
    return { saved };
  }
}
