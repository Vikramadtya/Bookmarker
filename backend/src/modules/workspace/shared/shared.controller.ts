import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@core/common/decorators/public.decorator';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { UsersService } from '@identity/users/application/services/users.service';

@ApiTags('shared')
@Public() // All routes in this controller are publicly accessible — no JWT required
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
    const {
      passwordHash: _passwordHash,
      userId: _userId,
      ...safeFolder
    } = folder;
    return safeFolder;
  }

  @Post(':username/:slug/unlock')
  async unlockPublicFolder(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Body('password') password?: string,
  ) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const folder = await this.foldersService.getPublicFolderBySlug(
      user.email,
      slug,
    );

    const isValid = await this.foldersService.verifyPassword(
      folder.id,
      password,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid folder password');
    }

    return {
      token: this.foldersService.generateUnlockToken(
        folder.id,
        folder.passwordHash as string,
      ),
    };
  }

  @Get(':username/:slug/bookmarks')
  async getPublicFolderBookmarks(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Headers('x-folder-token') folderToken?: string,
  ) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const folder = await this.foldersService.getPublicFolderBySlug(
      user.email,
      slug,
    );

    if (folder.isLocked) {
      const isValid =
        folderToken &&
        this.foldersService.verifyUnlockToken(
          folder.id,
          folder.passwordHash as string,
          folderToken,
        );
      if (!isValid)
        throw new UnauthorizedException(
          'Folder is locked. Provide a valid x-folder-token header.',
        );
    }

    return this.bookmarksService.getBookmarks(
      user.email,
      folder.id || folder.id.toString(),
    );
  }
}
