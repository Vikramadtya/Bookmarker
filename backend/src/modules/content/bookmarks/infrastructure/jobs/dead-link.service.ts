import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Agenda } from 'agenda';
import { IBookmarkRepository } from '../../domain/repositories/bookmark.repository.interface';
import { safeRequest } from '@core/security/url-safety';
import { mapLimit } from '@core/common/async';

const RECHECK_AFTER_DAYS = 30;
const BATCH_SIZE = 100;
const MAX_PER_RUN = 2000;
const CONCURRENCY = 10;
const DEAD_STATUSES = new Set([404, 410]);
// Servers that reject HEAD but would serve GET.
const HEAD_UNSUPPORTED = new Set([400, 403, 405, 501]);

@Injectable()
export class DeadLinkService implements OnModuleInit {
  private readonly logger = new Logger(DeadLinkService.name);

  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarksRepository: IBookmarkRepository,
    @Inject('AGENDA') private readonly agenda: Agenda,
  ) {}

  /** Scheduled through Agenda so only one instance runs it, however many replicas are up. */
  async onModuleInit() {
    this.agenda.define('check-dead-links', async () => this.run());
    try {
      await this.agenda.every('1 week', 'check-dead-links');
    } catch (error) {
      this.logger.error(
        'Could not schedule dead-link check',
        (error as Error).stack,
      );
    }
  }

  private async run() {
    const cutoff = new Date(
      Date.now() - RECHECK_AFTER_DAYS * 24 * 60 * 60 * 1000,
    );
    let processed = 0;

    while (processed < MAX_PER_RUN) {
      const batch = await this.bookmarksRepository.findStaleLinks(
        cutoff,
        BATCH_SIZE,
      );
      if (batch.length === 0) break;

      const results = await mapLimit(batch, CONCURRENCY, async (b) => ({
        id: b.id,
        isDeadLink: await this.isDead(b.bookmarkURL),
      }));
      await this.bookmarksRepository.bulkSetLinkStatus(results);
      processed += batch.length;
    }
    this.logger.log(`Dead-link check finished (${processed} checked)`);
  }

  private async isDead(url: string): Promise<boolean> {
    try {
      let res = await safeRequest(url, { method: 'HEAD', timeoutMs: 10_000 });
      if (HEAD_UNSUPPORTED.has(res.status)) {
        res = await safeRequest(url, {
          method: 'GET',
          timeoutMs: 10_000,
          maxBytes: 1024,
        });
      }
      return DEAD_STATUSES.has(res.status);
    } catch (error) {
      // Only a name that does not resolve counts as dead; timeouts and 5xx may be temporary.
      return (error as NodeJS.ErrnoException).code === 'ENOTFOUND';
    }
  }
}
