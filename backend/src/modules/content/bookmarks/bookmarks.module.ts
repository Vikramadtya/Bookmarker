import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksController } from './presentation/http/bookmarks.controller';
import { BookmarksService } from './application/services/bookmarks.service';
import { BookmarksMongooseRepository } from './infrastructure/persistence/bookmark.mongoose.repository';
import {
  Bookmark,
  BookmarkSchema,
} from './infrastructure/persistence/bookmark.schema';
import { ScrapeService } from './infrastructure/jobs/scrape.service';
import { DeadLinkService } from './infrastructure/jobs/dead-link.service';
import { FoldersModule } from '@workspace/folders/folders.module';

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
    {
      provide: 'IBookmarkRepository',
      useClass: BookmarksMongooseRepository,
    },
    ScrapeService,
    DeadLinkService,
  ],
  exports: [BookmarksService, 'IBookmarkRepository'],
})
export class BookmarksModule {}
