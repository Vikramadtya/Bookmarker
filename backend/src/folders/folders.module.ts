import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FoldersRepository } from './folders.repository';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { SharedController } from './shared.controller';
import { BookmarksModule } from '../bookmarks/bookmarks.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    forwardRef(() => BookmarksModule),
    UsersModule,
  ],
  controllers: [FoldersController, SharedController],
  providers: [FoldersService, FoldersRepository],
  exports: [FoldersService],
})
export class FoldersModule {}
