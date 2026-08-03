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
import { AuthGuard } from '@nestjs/passport';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
    return this.foldersService.getAllFolders(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a folder or sub-folder' })
  @ApiBody({ type: CreateFolderDto })
  @ApiResponse({ status: 201, description: 'Folder created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createFolder(
    @CurrentUser('email') userId: string,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.createFolder(userId, createFolderDto);
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
    return this.foldersService.getFolderById(userId, id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get child folders of a collection' })
  @ApiParam({ name: 'id', description: 'Parent folder UUID' })
  @ApiResponse({ status: 200, description: 'List of child folders' })
  async getFolderChildren(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
  ) {
    return this.foldersService.getChildren(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Rename a folder' })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiBody({ type: UpdateFolderDto })
  @ApiResponse({ status: 200, description: 'Updated folder' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async updateFolder(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.updateFolder(userId, id, updateFolderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a folder. Use action query param to handle its bookmarks.',
  })
  @ApiParam({ name: 'id', description: 'Folder UUID' })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['delete_bookmarks', 'move_to_inbox'],
    description: 'What to do with bookmarks inside the folder',
  })
  @ApiResponse({ status: 204, description: 'Folder deleted' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async deleteFolder(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Query('action') action?: 'delete_bookmarks' | 'move_to_inbox',
  ) {
    await this.foldersService.deleteFolder(userId, id, action);
  }
}
