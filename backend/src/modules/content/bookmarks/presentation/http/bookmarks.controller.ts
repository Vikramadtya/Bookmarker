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
  UseGuards,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookmarksService } from '../../application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { ListBookmarksDto } from './dto/list-bookmarks.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkMoveDto } from './dto/bulk-move.dto';
import {
  BulkUpdateDto,
  HighlightDto,
  MergeBookmarksDto,
} from './dto/bulk-update.dto';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';

const UUID_LIST = /^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36})*$/;
const MAX_FOLDER_IDS = 50;

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
    summary:
      'List bookmarks (newest first, cursor-paginated) with optional folder, tag and search filters',
  })
  @ApiResponse({ status: 200, description: '{ items, nextCursor }' })
  async list(
    @CurrentUser('email') userId: string,
    @Query() query: ListBookmarksDto,
    @Headers('x-folder-token') folderToken?: string,
  ) {
    await this.assertFolderAccess(userId, query.folderId, folderToken);
    return this.bookmarksService.listBookmarks(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a bookmark (metadata is scraped in the background if title/description/logo are missing)',
  })
  @ApiBody({ type: CreateBookmarkDto })
  async create(
    @CurrentUser('email') userId: string,
    @Body() dto: CreateBookmarkDto,
  ) {
    await this.foldersService.getFolderById(userId, dto.folderId);
    return this.bookmarksService.createBookmark(userId, dto);
  }

  @Get('counts')
  @ApiOperation({
    summary: 'Badge counts: total, unread, archived, dead, duplicates',
  })
  getCounts(@CurrentUser('email') userId: string) {
    return this.bookmarksService.getCounts(userId);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Is this URL already saved (ignoring tracking noise)?',
  })
  check(@CurrentUser('email') userId: string, @Query('url') url = '') {
    return this.bookmarksService.findDuplicate(userId, url.slice(0, 2048));
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Groups of bookmarks that point at the same page' })
  duplicates(@CurrentUser('email') userId: string) {
    return this.bookmarksService.getDuplicateGroups(userId);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge duplicates into one bookmark' })
  @ApiBody({ type: MergeBookmarksDto })
  merge(@CurrentUser('email') userId: string, @Body() body: MergeBookmarksDto) {
    return this.bookmarksService.mergeBookmarks(
      userId,
      body.keepId,
      body.mergeIds,
    );
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Set status/favorite/pinned or add/remove tags on many bookmarks',
  })
  @ApiBody({ type: BulkUpdateDto })
  async bulkUpdate(
    @CurrentUser('email') userId: string,
    @Body() { ids, ...changes }: BulkUpdateDto,
  ) {
    await this.bookmarksService.bulkUpdate(userId, ids, changes);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all unique tags across all bookmarks' })
  getTags(@CurrentUser('email') userId: string) {
    return this.bookmarksService.getTags(userId);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete up to 500 bookmarks by ID' })
  @ApiBody({ type: BulkDeleteDto })
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
  async bulkMove(
    @CurrentUser('email') userId: string,
    @Body() body: BulkMoveDto,
  ) {
    await this.foldersService.getFolderById(userId, body.folderId);
    await this.bookmarksService.bulkMove(userId, body.ids, body.folderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bookmark by ID' })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  getById(@CurrentUser('email') userId: string, @Param('id') id: string) {
    return this.bookmarksService.getBookmarkById(userId, id);
  }

  @Post(':id/opened')
  @ApiOperation({ summary: 'Record that the link was opened' })
  recordOpen(@CurrentUser('email') userId: string, @Param('id') id: string) {
    return this.bookmarksService.recordOpen(userId, id);
  }

  @Post(':id/highlights')
  @ApiOperation({
    summary: 'Add a highlight (with optional note) to a bookmark',
  })
  addHighlight(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() body: HighlightDto,
  ) {
    return this.bookmarksService.addHighlight(userId, id, body.text, body.note);
  }

  @Delete(':id/highlights/:highlightId')
  @ApiOperation({ summary: 'Remove a highlight' })
  removeHighlight(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Param('highlightId') highlightId: string,
  ) {
    return this.bookmarksService.removeHighlight(userId, id, highlightId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a bookmark (partial updates supported)' })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  @ApiBody({ type: UpdateBookmarkDto })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async update(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBookmarkDto,
  ) {
    if (dto.folderId)
      await this.foldersService.getFolderById(userId, dto.folderId);
    return this.bookmarksService.updateBookmark(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark by ID' })
  @ApiParam({ name: 'id', description: 'Bookmark UUID' })
  async remove(@CurrentUser('email') userId: string, @Param('id') id: string) {
    await this.bookmarksService.deleteBookmark(userId, id);
  }

  /**
   * Every folder named in `folderId` (one id, or a comma-separated list for
   * collection views) must belong to the caller, and locked ones need a valid token.
   */
  private async assertFolderAccess(
    userId: string,
    folderId?: string,
    folderToken?: string,
  ) {
    if (!folderId || !UUID_LIST.test(folderId)) return;

    const ids = [...new Set(folderId.split(',').slice(0, MAX_FOLDER_IDS))];
    const folders = await this.foldersService.getFoldersByIds(ids);
    for (const folder of folders) {
      // Same response for "not yours" and "does not exist" so lock status can't be probed.
      if (folder.userId !== userId)
        throw new NotFoundException('Folder not found');
      this.foldersService.assertUnlocked(folder, folderToken);
    }
  }
}
