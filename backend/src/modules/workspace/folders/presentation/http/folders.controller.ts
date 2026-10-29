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
  ForbiddenException,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { FoldersService } from '../../application/services/folders.service';
import { toFolderView } from '../../domain/entities/folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';

enum DeleteAction {
  DeleteBookmarks = 'delete_bookmarks',
  MoveToInbox = 'move_to_inbox',
}

@ApiTags('folders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all folders' })
  @ApiResponse({ status: 200, description: 'Flat list of all folders' })
  async getAllFolders(@CurrentUser('email') userId: string) {
    return (await this.foldersService.getAllFolders(userId)).map(toFolderView);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a folder or sub-folder' })
  @ApiBody({ type: CreateFolderDto })
  @ApiResponse({ status: 201, description: 'Folder created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createFolder(
    @CurrentUser('email') userId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return toFolderView(await this.foldersService.createFolder(userId, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiResponse({ status: 200, description: 'The folder' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async getFolderById(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
  ) {
    return toFolderView(await this.foldersService.getFolderById(userId, id));
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get child folders of a collection' })
  @ApiParam({ name: 'id', description: 'Parent folder UUID' })
  async getFolderChildren(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
  ) {
    return (await this.foldersService.getChildren(userId, id)).map(
      toFolderView,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a folder (rename, visibility, lock, parent)',
  })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiBody({ type: UpdateFolderDto })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async updateFolder(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return toFolderView(
      await this.foldersService.updateFolder(userId, id, dto),
    );
  }

  @Post(':id/unlock')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a password-protected folder' })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiBody({
    schema: { type: 'object', properties: { password: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'Unlock token returned' })
  @ApiResponse({ status: 403, description: 'Invalid password' })
  async unlockFolder(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body('password') password?: string,
  ) {
    const folder = await this.foldersService.getFolderById(userId, id);
    if (!(await this.foldersService.verifyPassword(folder, password))) {
      throw new ForbiddenException('Invalid folder password');
    }
    return { token: this.foldersService.generateUnlockToken(folder) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a folder and its sub-folders. Bookmarks move to the Inbox by default.',
  })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiQuery({ name: 'action', required: false, enum: DeleteAction })
  @ApiResponse({ status: 204, description: 'Folder deleted' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async deleteFolder(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Query('action', new ParseEnumPipe(DeleteAction, { optional: true }))
    action?: DeleteAction,
  ) {
    await this.foldersService.deleteFolder(userId, id, action);
  }
}
