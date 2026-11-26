import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { FoldersModule } from '@workspace/folders/folders.module';
import {
  Bookmark,
  BookmarkSchema,
} from '@content/bookmarks/infrastructure/persistence/bookmark.schema';
import {
  OAuthClient,
  OAuthClientSchema,
  OAuthGrant,
  OAuthGrantSchema,
  OrganizeSession,
  OrganizeSessionSchema,
  Proposal,
  ProposalSchema,
} from './schemas';
import { OrganizeService } from './organize.service';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { McpController } from './mcp.controller';
import { OrganizeController } from './organize.controller';

/** Lets a user connect Claude to suggest tags, descriptions and folders. */
@Module({
  imports: [
    BookmarksModule,
    FoldersModule,
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
      { name: OrganizeSession.name, schema: OrganizeSessionSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: OAuthClient.name, schema: OAuthClientSchema },
      { name: OAuthGrant.name, schema: OAuthGrantSchema },
    ]),
  ],
  controllers: [OAuthController, McpController, OrganizeController],
  providers: [OrganizeService, OAuthService],
})
export class ClaudeModule {}
