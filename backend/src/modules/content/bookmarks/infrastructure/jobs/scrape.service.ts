import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Agenda, Job } from 'agenda';
import * as cheerio from 'cheerio';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import sanitizeHtml from 'sanitize-html';
import {
  IBookmarkRepository,
  ScrapeResult,
} from '../../domain/repositories/bookmark.repository.interface';
import { EventsGateway } from '@content/events/events.gateway';
import { safeRequest } from '@core/security/url-safety';
import { mapLimit } from '@core/common/async';

interface ScrapeTarget {
  bookmarkId: string;
  url: string;
}

interface Metadata {
  title: string;
  description: string;
  logoURL: string;
  imageURL: string;
  content: string;
  isArticle: boolean;
}

const BATCH_CONCURRENCY = 4;
const MAX_ARTICLE_CHARS = 500_000;

const faviconFor = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`;

@Injectable()
export class ScrapeService implements OnModuleInit {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    private readonly eventsGateway: EventsGateway,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  onModuleInit() {
    this.agenda.define(
      'scrape-metadata',
      async (job: Job<ScrapeTarget & { userId: string }>) => {
        await this.scrape(job.attrs.data.userId, job.attrs.data);
      },
      { concurrency: 2 },
    );

    this.agenda.define(
      'scrape-batch',
      async (job: Job<{ userId: string; items: ScrapeTarget[] }>) => {
        const { userId, items } = job.attrs.data;
        await mapLimit(items, BATCH_CONCURRENCY, (item) =>
          this.scrape(userId, item),
        );
      },
      { concurrency: 1, lockLifetime: 30 * 60 * 1000 },
    );
  }

  /** Never throws: a failed scrape is recorded on the bookmark instead of retried forever. */
  private async scrape(
    userId: string,
    { bookmarkId, url }: ScrapeTarget,
  ): Promise<void> {
    let result: ScrapeResult;
    try {
      const meta = await this.extractMetadata(url);
      result = { ...meta, scrapeStatus: 'done' };
    } catch (error) {
      this.logger.warn(`Scrape failed for ${url}: ${(error as Error).message}`);
      result = {
        title: this.hostnameOf(url),
        logoURL: this.safe(() => faviconFor(url)),
        scrapeStatus: 'failed',
      };
    }

    try {
      const updated = await this.bookmarksRepository.applyScrapeResult(
        bookmarkId,
        result,
      );
      if (updated) {
        this.eventsGateway.emitBookmarkUpdated(userId, bookmarkId, {
          title: updated.title,
          description: updated.description,
          logoURL: updated.logoURL,
          imageURL: updated.imageURL,
          isArticle: updated.isArticle,
          scrapeStatus: updated.scrapeStatus,
        });
      }
    } catch (error) {
      this.logger.error(
        `Could not save scrape result for ${bookmarkId}`,
        (error as Error).stack,
      );
    }
  }

  private async extractMetadata(url: string): Promise<Metadata> {
    const response = await safeRequest(url, {
      timeoutMs: 8000,
      maxBytes: 2_000_000,
    });
    if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
    return this.parseHtml(response.body, response.url);
  }

  private parseHtml(html: string, baseUrl: string): Metadata {
    const $ = cheerio.load(html);
    const text = (value: string | undefined) =>
      sanitizeHtml((value ?? '').trim(), { allowedTags: [] }).slice(0, 500);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').first().text();
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');
    // The preview image is kept apart from the site icon: cards show the image
    // as a thumbnail and the icon as a small badge.
    // Sites use property= or name= interchangeably for these tags.
    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[property="twitter:image"]').attr('content');
    const logo =
      $('link[rel="apple-touch-icon"]').attr('href') ||
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    const article = this.extractArticle(html);
    return {
      title: text(title),
      description: text(description).slice(0, 2000),
      logoURL:
        this.resolveHttpUrl(logo, baseUrl) ||
        this.safe(() => faviconFor(baseUrl)),
      imageURL: this.resolveHttpUrl(image, baseUrl),
      content: article,
      isArticle: article.length > 0,
    };
  }

  private extractArticle(html: string): string {
    try {
      const { document } = parseHTML(html);
      const parsed = new Readability(document as unknown as Document).parse();
      if (!parsed?.content) return '';

      const clean = sanitizeHtml(parsed.content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img',
          'h1',
          'h2',
        ]),
        allowedSchemes: ['http', 'https', 'mailto'],
      });
      return clean.length <= MAX_ARTICLE_CHARS ? clean : '';
    } catch (error) {
      this.logger.debug(`Readability failed: ${(error as Error).message}`);
      return '';
    }
  }

  private resolveHttpUrl(href: string | undefined, baseUrl: string): string {
    if (!href) return '';
    try {
      const resolved = new URL(href, baseUrl);
      return resolved.protocol === 'http:' || resolved.protocol === 'https:'
        ? resolved.toString().slice(0, 2048)
        : '';
    } catch {
      return '';
    }
  }

  private hostnameOf(url: string): string {
    return this.safe(() => new URL(url).hostname) || 'Unknown Site';
  }

  private safe(fn: () => string): string {
    try {
      return fn();
    } catch {
      return '';
    }
  }
}
