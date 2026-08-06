import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookmarksRepository } from './bookmarks.repository';
import axios from 'axios';

@Injectable()
export class DeadLinkService {
  private readonly logger = new Logger(DeadLinkService.name);

  constructor(private readonly bookmarksRepository: BookmarksRepository) {}

  // Run every Sunday at midnight
  @Cron(CronExpression.EVERY_WEEK)
  async checkDeadLinks() {
    this.logger.log('Starting dead link check...');

    // Find bookmarks that haven't been checked in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Limit to 100 to avoid overwhelming the server in one go
    const bookmarksToCheck = await this.bookmarksRepository.findWithFilter(
      {
        $or: [
          { lastCheckedAt: { $exists: false } },
          { lastCheckedAt: { $lt: thirtyDaysAgo } },
        ],
      },
      { limit: 100 },
    );

    if (bookmarksToCheck.length === 0) {
      this.logger.log('No bookmarks need checking right now.');
      return;
    }

    this.logger.log(`Found ${bookmarksToCheck.length} bookmarks to check.`);

    for (const bookmark of bookmarksToCheck) {
      try {
        // Ping the URL
        await axios.head(bookmark.bookmarkURL, { timeout: 10000 });

        // It's alive
        await this.bookmarksRepository.updateById(bookmark._id.toString(), {
          isDeadLink: false,
          lastCheckedAt: new Date(),
        });
      } catch (error) {
        // If it's a 4xx or 5xx, or network error (like ENOTFOUND)
        const isDead =
          !!error.response ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNABORTED';

        await this.bookmarksRepository.updateById(bookmark._id.toString(), {
          isDeadLink: isDead,
          lastCheckedAt: new Date(),
        });

        if (isDead) {
          this.logger.warn(`Found dead link: ${bookmark.bookmarkURL}`);
        }
      }
    }

    this.logger.log('Finished dead link check run.');
  }
}
