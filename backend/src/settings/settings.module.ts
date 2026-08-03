import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { BookmarksModule } from '../bookmarks/bookmarks.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [BookmarksModule, FoldersModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
