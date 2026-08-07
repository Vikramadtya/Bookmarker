import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';
import { BookmarksService } from './bookmarks.service';
import { FoldersService } from '../folders/folders.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkMoveDto } from './dto/bulk-move.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookmarks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/bookmarks')
export class BookmarksController {
  constructor(
    private readonly bookmarksService: BookmarksService,
    private readonly foldersService: FoldersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List bookmarks with optional folder, search, and field filters',
  })
  @ApiQuery({
    name: 'folderId',
    required: false,
    description: 'Filter by folder ID, "root", or "favorites"',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Full-text search query',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description:
      'Comma-separated fields to search within (e.g. title,description,tags)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bookmarks matching the criteria',
  })
  async getBookmarks(
    @CurrentUser('email') userId: string,
    @Headers('x-folder-token') folderToken?: string,
    @Query('folderId') folderId?: string,
    @Query('q') q?: string,
    @Query('fields') fields?: string,
  ) {
    if (folderId && folderId !== 'root' && folderId !== 'favorites') {
      // Validate folder access if it's locked
      const isUUIDList = /^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36})*$/.test(
        folderId,
      );
      if (isUUIDList) {
        const ids = folderId.split(',');
        for (const id of ids) {
          const folder = await this.foldersService.getFolderByIdUnscoped(id);
          if (folder && folder.isLocked) {
            if (
              !folderToken ||
              !this.foldersService.verifyUnlockToken(
                folder._id,
                folder.passwordHash,
                folderToken,
              )
            ) {
              throw new UnauthorizedException(
                'Folder is locked. Provide a valid x-folder-token header.',
              );
            }
          }
        }
      }
    }

    return this.bookmarksService.getBookmarks(userId, folderId, q, fields);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a new bookmark (auto-scrapes metadata if title/description/logo missing)',
  })
  @ApiBody({ type: CreateBookmarkDto })
  @ApiResponse({
    status: 201,
    description: 'Bookmark created. Metadata scraping queued if needed.',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createBookmark(
    @CurrentUser('email') userId: string,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createBookmark(userId, createBookmarkDto);
  }

  @Get('tags')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @ApiOperation({
    summary: 'Get all unique tags across all bookmarks (cached 5 min)',
  })
  @ApiResponse({ status: 200, description: 'Array of unique tag strings' })
  async getTags(@CurrentUser('email') userId: string) {
    return this.bookmarksService.getTags(userId);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete up to 500 bookmarks by ID' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 204, description: 'Bookmarks deleted' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async bulkDelete(
    @CurrentUser('email') userId: string,
    @Body() body: BulkDeleteDto,
  ) {
    await this.bookmarksService.bulkDelete(userId, body.ids);
  }

  @Post('bulk-move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move up to 500 bookmarks to a target folder' })
  @ApiBody({ type: BulkMoveDto })
  @ApiResponse({ status: 204, description: 'Bookmarks moved' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async bulkMove(
    @CurrentUser('email') userId: string,
    @Body() body: BulkMoveDto,
  ) {
    await this.bookmarksService.bulkMove(userId, body.ids, body.folderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bookmark by ID' })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  @ApiResponse({ status: 200, description: 'The bookmark' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async getBookmarkById(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
  ) {
    return this.bookmarksService.getBookmarkById(userId, id);
  }

  @Put(':id')
  @ApiOperation({
    summary:
      'Update a bookmark (supports partial updates including isFavorite toggle)',
  })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  @ApiBody({ type: UpdateBookmarkDto })
  @ApiResponse({ status: 200, description: 'Updated bookmark' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async updateBookmark(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.updateBookmark(userId, id, updateBookmarkDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark by ID' })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  @ApiResponse({ status: 204, description: 'Bookmark deleted' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async deleteBookmark(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
  ) {
    await this.bookmarksService.deleteBookmark(userId, id);
  }
}
