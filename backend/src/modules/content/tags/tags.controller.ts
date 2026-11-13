import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { TagsService } from './tags.service';

class RenameTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  from: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  to: string;
}

class TagColorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  tag: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsHexColor()
  color: string | null;
}

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'All tags with counts and colors' })
  list(@CurrentUser('email') userId: string) {
    return this.tags.list(userId);
  }

  @Post('rename')
  @ApiOperation({
    summary: 'Rename a tag (and its nested tags); merges into an existing tag',
  })
  rename(@CurrentUser('email') userId: string, @Body() body: RenameTagDto) {
    return this.tags.rename(userId, body.from, body.to);
  }

  @Put('color')
  @ApiOperation({ summary: 'Set or clear a tag color' })
  color(@CurrentUser('email') userId: string, @Body() body: TagColorDto) {
    return this.tags.setColor(userId, body.tag, body.color ?? null);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tag from every bookmark' })
  remove(@CurrentUser('email') userId: string, @Query('tag') tag: string) {
    return this.tags.remove(userId, tag);
  }
}
