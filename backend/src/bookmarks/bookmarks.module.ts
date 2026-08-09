import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { BookmarksRepository } from './bookmarks.repository';
import { Bookmark, BookmarkSchema } from './schemas/bookmark.schema';
import { ScrapeService } from './scrape.service';
import { DeadLinkService } from './dead-link.service';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [
    forwardRef(() => FoldersModule),
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [BookmarksController],
  providers: [
    BookmarksService,
    BookmarksRepository,
    ScrapeService,
    DeadLinkService,
  ],
  exports: [BookmarksService],
})
export class BookmarksModule {}
