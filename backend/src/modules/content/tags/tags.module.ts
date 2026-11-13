import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarkStoreModule } from '@content/bookmarks/bookmark-store.module';
import { TagMeta, TagMetaSchema } from './tag-meta.schema';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  imports: [
    BookmarkStoreModule,
    MongooseModule.forFeature([{ name: TagMeta.name, schema: TagMetaSchema }]),
  ],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
