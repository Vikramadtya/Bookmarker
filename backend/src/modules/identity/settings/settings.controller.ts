import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from './settings.service';
import { ImportDto } from './dto/import.dto';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('export')
  @ApiOperation({
    summary:
      'Export bookmarks: Netscape HTML (default), JSON or CSV. With folderId, only that folder and its subfolders (JSON or CSV)',
  })
  @ApiResponse({ status: 200, description: 'File content as a string' })
  async exportData(
    @CurrentUser('email') userId: string,
    @Query('format') format?: string,
    @Query('folderId') folderId?: string,
    @Headers('x-folder-token') folderToken?: string,
  ) {
    if (format === 'json')
      return this.settingsService.exportToJson(userId, folderId, folderToken);
    if (format === 'csv')
      return this.settingsService.exportToCsv(userId, folderId, folderToken);
    // Never answer a one-folder request with the whole library.
    if (folderId)
      throw new BadRequestException('A folder can be exported as JSON or CSV');
    return this.settingsService.exportToHtml(userId);
  }

  @Post('import')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Import from HTML, JSON or CSV (browsers, Raindrop, Pinboard, Pocket)',
  })
  @ApiBody({ type: ImportDto })
  @ApiResponse({ status: 200, description: 'Import successful' })
  async importData(
    @CurrentUser('email') userId: string,
    @Body() importDto: ImportDto,
  ) {
    return this.settingsService.importData(userId, importDto.htmlContent);
  }

  @Delete('data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ALL user bookmarks and folders' })
  @ApiResponse({ status: 204, description: 'Data deleted' })
  async deleteAllData(@CurrentUser('email') userId: string) {
    await this.settingsService.deleteAllData(userId);
  }
}
