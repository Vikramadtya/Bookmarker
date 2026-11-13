import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
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
    summary: 'Export all bookmarks: Netscape HTML (default), JSON or CSV',
  })
  @ApiResponse({ status: 200, description: 'File content as a string' })
  async exportData(
    @CurrentUser('email') userId: string,
    @Query('format') format?: string,
  ) {
    if (format === 'json') return this.settingsService.exportToJson(userId);
    if (format === 'csv') return this.settingsService.exportToCsv(userId);
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
