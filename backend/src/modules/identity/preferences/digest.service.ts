import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Agenda } from 'agenda';
import * as nodemailer from 'nodemailer';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { getFrontendUrl } from '@core/config/app.config';
import { Preferences } from './preferences.schema';

const RESURFACE_AFTER_DAYS = 45;
const escapeHtml = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface Digest {
  unread: number;
  savedThisWeek: number;
  resurfaced: {
    id: string;
    title: string;
    bookmarkURL: string;
    domain: string;
    imageURL: string;
    logoURL: string;
    creationDate: Date;
  }[];
}

/** The "what did I forget about" summary, shown in the app and optionally emailed weekly. */
@Injectable()
export class DigestService implements OnModuleInit {
  private readonly logger = new Logger(DigestService.name);
  private transporter?: nodemailer.Transporter;

  constructor(
    private readonly bookmarks: BookmarksService,
    private readonly config: ConfigService,
    @InjectModel(Preferences.name) private readonly prefs: Model<Preferences>,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  async onModuleInit() {
    const smtp = this.config.get<string>('SMTP_URL');
    if (smtp) this.transporter = nodemailer.createTransport(smtp);

    this.agenda.define('weekly-digest', async () => this.sendAll());
    try {
      await this.agenda.every('0 8 * * 1', 'weekly-digest'); // Mondays 08:00 UTC
    } catch (error) {
      this.logger.error(
        'Could not schedule the weekly digest',
        (error as Error).stack,
      );
    }
  }

  async build(userId: string): Promise<Digest> {
    const [counts, week, old] = await Promise.all([
      this.bookmarks.getCounts(userId),
      this.bookmarks.listBookmarks(userId, { q: 'saved:7d', limit: 100 }),
      this.bookmarks.listBookmarks(userId, {
        q: `is:unread older:${RESURFACE_AFTER_DAYS}d`,
        sort: 'oldest',
        limit: 5,
      }),
    ]);
    return {
      unread: counts.unread,
      savedThisWeek: week.items.length,
      resurfaced: old.items.map((b) => ({
        id: b.id,
        title: b.title,
        bookmarkURL: b.bookmarkURL,
        domain: b.domain,
        imageURL: b.imageURL,
        logoURL: b.logoURL,
        creationDate: b.creationDate,
      })),
    };
  }

  private async sendAll() {
    if (!this.transporter) {
      this.logger.log('Weekly digest skipped: SMTP_URL is not configured');
      return;
    }
    const recipients = await this.prefs
      .find({ digestEmail: true })
      .lean()
      .exec();
    for (const { userId } of recipients) {
      try {
        const digest = await this.build(userId);
        if (digest.unread === 0 && digest.savedThisWeek === 0) continue;
        await this.transporter.sendMail({
          from:
            this.config.get<string>('MAIL_FROM') ||
            'Bookmarker <no-reply@localhost>',
          to: userId,
          subject: `Your week in Bookmarker: ${digest.unread} unread`,
          html: this.render(digest),
        });
      } catch (error) {
        this.logger.warn(
          `Digest to a user failed: ${(error as Error).message}`,
        );
      }
    }
  }

  private render(d: Digest): string {
    const app = getFrontendUrl(this.config);
    const items = d.resurfaced
      .map(
        (b) =>
          `<li><a href="${escapeHtml(b.bookmarkURL)}">${escapeHtml(b.title || b.domain)}</a> <small>${escapeHtml(b.domain)}</small></li>`,
      )
      .join('');
    return (
      `<p>You saved <b>${d.savedThisWeek}</b> links this week and have <b>${d.unread}</b> unread.</p>` +
      (items ? `<p>Still waiting for you:</p><ul>${items}</ul>` : '') +
      `<p><a href="${escapeHtml(app)}">Open Bookmarker</a></p>`
    );
  }
}
