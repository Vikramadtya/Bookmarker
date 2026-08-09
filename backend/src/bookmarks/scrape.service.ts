import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { BookmarksRepository } from './bookmarks.repository';
import { EventsGateway } from '../events/events.gateway';
import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Agenda, Job } from 'agenda';

@Injectable()
export class ScrapeService implements OnModuleInit {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(
    private readonly bookmarksRepository: BookmarksRepository,
    private readonly eventsGateway: EventsGateway,
    @Inject('AGENDA') private agenda: Agenda,
  ) {}

  onModuleInit() {
    this.agenda.define(
      'scrape-metadata',
      async (job: Job<{ bookmarkId: string; url: string; userId: string }>) => {
        await this.process(job.attrs.data);
      },
    );
  }

  private async process({
    bookmarkId,
    url,
    userId,
  }: {
    bookmarkId: string;
    url: string;
    userId: string;
  }): Promise<void> {
    try {
      const metadata = await this.extractMetadata(url);
      const { title, description, logoURL, content, isArticle } = metadata;

      const updated = await this.bookmarksRepository.updateById(bookmarkId, {
        title: title || 'Untitled',
        description,
        logoURL,
        content: content || '',
        isArticle: isArticle || false,
      });

      if (updated) {
        this.logger.log(
          `Scraped metadata for bookmark ${bookmarkId}: "${title}"`,
        );
        this.eventsGateway.emitBookmarkUpdated(userId, bookmarkId, {
          title: updated.title,
          description,
          logoURL,
        });
      }
    } catch (error) {
      this.logger.error(
        `Scrape job failed for ${url}`,
        error instanceof Error ? error.stack : undefined,
      );

      const existingBookmark =
        await this.bookmarksRepository.findById(bookmarkId);
      let fallbackTitle = existingBookmark?.title;

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
    }
  }

  // ─── Metadata Extraction ──────────────────────────────────────────────────

  private async extractMetadata(url: string): Promise<{
    title: string;
    description: string;
    logoURL: string;
    content?: string;
    isArticle?: boolean;
  }> {
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
    try {
      return await this.scrapeWithPuppeteer(url);
    } catch (error) {
      this.logger.error(`Puppeteer failed for ${url}: ${error.message}`);
      // Ultimate fallback if both fetch and Puppeteer fail
      return {
        title: '',
        description: '',
        logoURL: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
        content: '',
        isArticle: false,
      };
    }
  }

  private parseHtml(
    html: string,
    baseUrl: string,
  ): {
    title: string;
    description: string;
    logoURL: string;
    content?: string;
    isArticle?: boolean;
  } {
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
      `https://www.google.com/s2/favicons?domain=${new URL(baseUrl).hostname}&sz=128`;

    logoURL = this.resolveUrl(logoURL, baseUrl);

    let articleContent = '';
    let isArticle = false;
    try {
      const doc = new JSDOM(html, { url: baseUrl });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      if (article && article.content) {
        articleContent = sanitizeHtml(article.content, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'img',
            'h1',
            'h2',
          ]),
        });
        isArticle = true;
      }
    } catch (err) {
      this.logger.warn(
        `Failed to parse Readability for ${baseUrl}: ${err.message}`,
      );
    }

    return {
      title: sanitizeHtml(title.trim(), { allowedTags: [] }),
      description: sanitizeHtml(description.trim(), { allowedTags: [] }),
      logoURL,
      content: articleContent,
      isArticle,
    };
  }

  private async scrapeWithPuppeteer(url: string): Promise<{
    title: string;
    description: string;
    logoURL: string;
    content?: string;
    isArticle?: boolean;
  }> {
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
      await browser.close();
    }
  }

  private resolveUrl(logoURL: string, baseUrl: string): string {
    if (!logoURL || logoURL.startsWith('http') || logoURL.startsWith('data:'))
      return logoURL;
    try {
      return new URL(logoURL, new URL(baseUrl).origin).toString();
    } catch {
      return '';
    }
  }
}
