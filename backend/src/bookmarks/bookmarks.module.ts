import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { BookmarksRepository } from './bookmarks.repository';
import { Bookmark, BookmarkSchema } from './schemas/bookmark.schema';
import { ScrapeProcessor } from './scrape.processor';
import { DeadLinkService } from './dead-link.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
    BullModule.registerQueue({
      name: 'scrape',
    }),
  ],
  controllers: [BookmarksController],
  providers: [
    BookmarksService,
    BookmarksRepository,
    ScrapeProcessor,
    DeadLinkService,
  ],
  exports: [BookmarksService],
})
export class BookmarksModule {}
