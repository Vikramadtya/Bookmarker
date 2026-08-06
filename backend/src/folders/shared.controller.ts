import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { UsersService } from '../users/users.service';

@Controller('api/v1/shared')
export class SharedController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly bookmarksService: BookmarksService,
    private readonly usersService: UsersService,
  ) {}

  @Get(':username/:slug')
  async getPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const folder = await this.foldersService.getPublicFolderBySlug(
      user.email,
      slug,
    );
    return folder;
  }

  @Get(':username/:slug/bookmarks')
  async getPublicFolderBookmarks(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const folder = await this.foldersService.getPublicFolderBySlug(
      user.email,
      slug,
    );

    return this.bookmarksService.getBookmarks(
      user.email,
      folder.id || folder._id.toString(),
    );
  }
}
