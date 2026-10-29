import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './presentation/http/folders.controller';
import { FoldersService } from './application/services/folders.service';
import { FoldersMongooseRepository } from './infrastructure/persistence/folder.mongoose.repository';
import {
  Folder,
  FolderSchema,
} from './infrastructure/persistence/folder.schema';
import { BookmarkStoreModule } from '@content/bookmarks/bookmark-store.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    BookmarkStoreModule,
  ],
  controllers: [FoldersController],
  providers: [
    FoldersService,
    { provide: 'IFolderRepository', useClass: FoldersMongooseRepository },
  ],
  exports: [FoldersService],
})
export class FoldersModule {}
