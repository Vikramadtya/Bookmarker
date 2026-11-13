import { Module } from '@nestjs/common';
import { SharedController, ShareLandingController } from './shared.controller';
import { FoldersModule } from '@workspace/folders/folders.module';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { UsersModule } from '@identity/users/users.module';

/**
 * SharedModule owns the public-facing read-only endpoints for shared collections.
 * These routes are unauthenticated (no JWT guard) — anyone with the public URL can access them.
 *
 * Routes: GET|POST /api/v1/shared/:username/:slug
 */
@Module({
  imports: [FoldersModule, BookmarksModule, UsersModule],
  controllers: [SharedController, ShareLandingController],
})
export class SharedModule {}
