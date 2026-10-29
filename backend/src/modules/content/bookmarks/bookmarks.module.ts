import { Module } from '@nestjs/common';
import { BookmarksController } from './presentation/http/bookmarks.controller';
import { BookmarksService } from './application/services/bookmarks.service';
import { BookmarkStoreModule } from './bookmark-store.module';
import { ScrapeService } from './infrastructure/jobs/scrape.service';
import { DeadLinkService } from './infrastructure/jobs/dead-link.service';
import { FoldersModule } from '@workspace/folders/folders.module';

@Module({
  imports: [BookmarkStoreModule, FoldersModule],
  controllers: [BookmarksController],
  providers: [BookmarksService, ScrapeService, DeadLinkService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
