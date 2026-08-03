import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FoldersRepository } from './folders.repository';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { BookmarksModule } from '../bookmarks/bookmarks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    forwardRef(() => BookmarksModule),
  ],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersRepository],
  exports: [FoldersService],
})
export class FoldersModule {}
