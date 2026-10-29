import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  Headers,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { UsersService } from '@identity/users/application/services/users.service';

/** Public, unauthenticated read-only access to folders their owners have shared. */
@ApiTags('shared')
@Controller('api/v1/shared')
export class SharedController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly bookmarksService: BookmarksService,
    private readonly usersService: UsersService,
  ) {}

  /** Folder info plus its bookmarks; `bookmarks` is null while the folder is locked. */
  @Get(':username/:slug')
  async getPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Headers('x-folder-token') folderToken?: string,
  ) {
    const folder = await this.resolveFolder(username, slug);
    const unlocked =
      !folder.isLocked ||
      this.foldersService.verifyUnlockToken(folder, folderToken);

    const bookmarks = unlocked
      ? (await this.bookmarksService.getAll(folder.userId, folder.id)).map(
          (b) => ({
            id: b.id,
            title: b.title,
            bookmarkURL: b.bookmarkURL,
            description: b.description,
            logoURL: b.logoURL,
            tags: b.tags,
            creationDate: b.creationDate,
          }),
        )
      : null;

    return {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      isLocked: folder.isLocked,
      bookmarks,
    };
  }

  @Post(':username/:slug/unlock')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async unlockPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Body('password') password?: string,
  ) {
    const folder = await this.resolveFolder(username, slug);
    if (!(await this.foldersService.verifyPassword(folder, password))) {
      throw new ForbiddenException('Invalid folder password');
    }
    return { token: this.foldersService.generateUnlockToken(folder) };
  }

  private async resolveFolder(username: string, slug: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('Folder not found');
    return this.foldersService.getPublicFolderBySlug(user.email, slug);
  }
}
