import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoldersController } from './presentation/http/folders.controller';
import { FoldersService } from './application/services/folders.service';
import { FoldersMongooseRepository } from './infrastructure/persistence/folder.mongoose.repository';
import {
  Folder,
  FolderSchema,
} from './infrastructure/persistence/folder.schema';
import { UsersModule } from '@identity/users/users.module';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Folder.name, schema: FolderSchema }]),
    UsersModule,
    forwardRef(() => BookmarksModule),
  ],
  controllers: [FoldersController],
  providers: [
    FoldersService,
    {
      provide: 'IFolderRepository',
      useClass: FoldersMongooseRepository,
    },
  ],
  exports: [FoldersService, 'IFolderRepository'],
})
export class FoldersModule {}
