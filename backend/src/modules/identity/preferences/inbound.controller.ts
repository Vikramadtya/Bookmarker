import {
  Body,
  Controller,
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

  @Post('email')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async receive(
    @Query('token') token: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const owner =
      token && /^[a-f0-9]{48}$/.test(token)
        ? await this.prefs.findOne({ captureToken: token }).lean().exec()
        : null;
    // Same answer for "no such token" and "bad token" so tokens cannot be probed.
    if (!owner) throw new NotFoundException();

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
