import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { BookmarksRepository } from './bookmarks.repository';
import { EventsGateway } from '../events/events.gateway';
import puppeteer from 'puppeteer';

@Processor('scrape', { concurrency: 3 })
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly bookmarksRepository: BookmarksRepository,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(
    job: Job<{ bookmarkId: string; url: string; userId: string }>,
  ): Promise<void> {
    const { bookmarkId, url, userId } = job.data;

    try {
      const metadata = await this.extractMetadata(url);
      const { title, description, logoURL } = metadata;

      // ✅ Fixed: was `update(bookmarkId, ...)` which takes a filterQuery — must use updateById
      const updated = await this.bookmarksRepository.updateById(bookmarkId, {
        title: title || 'Untitled',
        description,
        logoURL,
      });

      if (updated) {
        this.logger.log(
          `[Job ${job.id}] Scraped metadata for bookmark ${bookmarkId}: "${title}"`,
        );
        this.eventsGateway.emitBookmarkUpdated(userId, bookmarkId, {
          title: updated.title,
          description,
          logoURL,
        });
      }
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Scrape job failed for ${url} (Attempt ${job.attemptsMade} of ${job.opts.attempts})`,
        error instanceof Error ? error.stack : undefined,
      );

      // If this is the final attempt, update the database so it's not stuck on "Scraping..."
      if (job.attemptsMade >= (job.opts.attempts || 1)) {
        const existingBookmark =
          await this.bookmarksRepository.findById(bookmarkId);
        let fallbackTitle = existingBookmark?.title;

        // Only fallback to the hostname if the title wasn't manually set by the user
        if (!fallbackTitle || fallbackTitle === url) {
          try {
            fallbackTitle = new URL(url).hostname;
          } catch {
            fallbackTitle = 'Unknown Site';
          }
        }

        await this.bookmarksRepository.updateById(bookmarkId, {
          title: fallbackTitle,
          description: 'Failed to extract metadata',
        });

        this.eventsGateway.emitBookmarkUpdated(userId, bookmarkId, {
          title: fallbackTitle,
          description: 'Failed to extract metadata',
          error: 'Failed to extract metadata',
        });
      } else {
        // Just emit the error for the frontend without updating DB, so it knows it failed this attempt
        this.eventsGateway.emitBookmarkUpdated(userId, bookmarkId, {
          error: 'Failed to extract metadata',
        });
      }
      // Rethrow to let BullMQ handle the failure (retries, dead letter queue)
      throw error;
    }
  }

  // ─── Metadata Extraction ──────────────────────────────────────────────────

  private async extractMetadata(
    url: string,
  ): Promise<{ title: string; description: string; logoURL: string }> {
    // Fast path: plain HTTP fetch + Cheerio (no JS execution)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const html = await response.text();
        return this.parseHtml(html, url);
      }
    } catch {
      this.logger.warn(`Fetch failed for ${url}, falling back to Puppeteer`);
    }

    // Slow path: Puppeteer for JS-rendered pages
    return this.scrapeWithPuppeteer(url);
  }

  private parseHtml(
    html: string,
    baseUrl: string,
  ): { title: string; description: string; logoURL: string } {
    const $ = cheerio.load(html);
    const title =
      $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';
    let logoURL =
      $('meta[property="og:image"]').attr('content') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      '';

    logoURL = this.resolveUrl(logoURL, baseUrl);

    return {
      title: sanitizeHtml(title.trim(), { allowedTags: [] }),
      description: sanitizeHtml(description.trim(), { allowedTags: [] }),
      logoURL,
    };
  }

  private async scrapeWithPuppeteer(
    url: string,
  ): Promise<{ title: string; description: string; logoURL: string }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const html = await page.content();
      return this.parseHtml(html, url);
    } finally {
      // ✅ Always close the browser — even if page.goto() throws
      await browser.close();
    }
  }

  private resolveUrl(logoURL: string, baseUrl: string): string {
    if (!logoURL || logoURL.startsWith('http')) return logoURL;
    try {
      return new URL(logoURL, new URL(baseUrl).origin).toString();
    } catch {
      return '';
    }
  }
}
