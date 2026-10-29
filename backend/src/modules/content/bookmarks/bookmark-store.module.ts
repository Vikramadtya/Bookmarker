import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Bookmark,
  BookmarkSchema,
} from './infrastructure/persistence/bookmark.schema';
import { BookmarksMongooseRepository } from './infrastructure/persistence/bookmark.mongoose.repository';

/** Persistence only, so the folders module can use it without depending on BookmarksModule. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  providers: [
    { provide: 'IBookmarkRepository', useClass: BookmarksMongooseRepository },
  ],
  exports: ['IBookmarkRepository'],
})
export class BookmarkStoreModule {}
