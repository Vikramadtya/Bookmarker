import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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
import { SettingsService } from './settings.service';
import { ImportDto } from './dto/import.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export all bookmarks and folders in Netscape HTML format',
  })
  @ApiResponse({ status: 200, description: 'HTML string content' })
  async exportData(@CurrentUser('email') userId: string) {
    return this.settingsService.exportToHtml(userId);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import bookmarks and folders from Netscape HTML string',
  })
  @ApiBody({ type: ImportDto })
  @ApiResponse({ status: 200, description: 'Import successful' })
  async importData(
    @CurrentUser('email') userId: string,
    @Body() importDto: ImportDto,
  ) {
    return this.settingsService.importFromHtml(userId, importDto.htmlContent);
  }

  @Delete('data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ALL user bookmarks and folders' })
  @ApiResponse({ status: 204, description: 'Data deleted' })
  async deleteAllData(@CurrentUser('email') userId: string) {
    await this.settingsService.deleteAllData(userId);
  }
}
