import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { FoldersModule } from '@workspace/folders/folders.module';
import { Preferences, PreferencesSchema } from './preferences.schema';
import { PreferencesController } from './preferences.controller';
import { InboundController } from './inbound.controller';
import { DigestService } from './digest.service';

@Module({
  imports: [
    BookmarksModule,
    FoldersModule,
    MongooseModule.forFeature([
      { name: Preferences.name, schema: PreferencesSchema },
    ]),
  ],
  controllers: [PreferencesController, InboundController],
  providers: [DigestService],
})
export class PreferencesModule {}
