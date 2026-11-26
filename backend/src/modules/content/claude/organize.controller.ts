import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { getFrontendUrl } from '@core/config/app.config';
import { OrganizeService } from './organize.service';
import { OAuthError, OAuthService } from './oauth.service';

class StartDto {
  /** Also share notes and highlights. */
  @IsOptional()
  @IsBoolean()
  includeNotes?: boolean;
}

class IdsDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  ids: string[];
}

class DecisionDto {
  @IsBoolean()
  allow: boolean;
}

/** The signed-in side: start a session, approve Claude, review its suggestions. */
@ApiTags('organize')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/organize')
export class OrganizeController {
  constructor(
    private readonly organize: OrganizeService,
    private readonly oauth: OAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('session')
  @ApiOperation({ summary: 'The latest session and the connector address' })
  async current(@CurrentUser('email') userId: string) {
    return {
      connectorUrl: this.oauth.resource,
      session: await this.organize.current(userId),
    };
  }

  @Post('session')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a one-hour session Claude can connect to' })
  start(@CurrentUser('email') userId: string, @Body() dto: StartDto) {
    return this.organize.start(userId, !!dto.includeNotes);
  }

  @Delete('session/:id')
  @ApiOperation({ summary: "End Claude's access now" })
  end(@CurrentUser('email') userId: string, @Param('id') id: string) {
    return this.organize.end(userId, id);
  }

  @Get('session/:id/proposals')
  proposals(@CurrentUser('email') userId: string, @Param('id') id: string) {
    return this.organize.listProposals(userId, id);
  }

  @Post('session/:id/apply')
  @HttpCode(200)
  apply(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() dto: IdsDto,
  ) {
    return this.organize.apply(userId, id, dto.ids);
  }

  @Post('session/:id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() dto: IdsDto,
  ) {
    return this.organize.reject(userId, id, dto.ids);
  }

  @Post('session/:id/undo')
  @HttpCode(200)
  undo(@CurrentUser('email') userId: string, @Param('id') id: string) {
    return this.organize.undo(userId, id);
  }

  @Get('connect/:request')
  async request(
    @CurrentUser('email') userId: string,
    @Param('request') key: string,
  ) {
    const found = await this.oauth.describeRequest(userId, key);
    if (!found)
      throw new NotFoundException(
        'This request has expired. Connect again from Claude.',
      );
    return found;
  }

  @Post('connect/:request')
  @HttpCode(200)
  async decide(
    @CurrentUser('email') userId: string,
    @Param('request') key: string,
    @Body() dto: DecisionDto,
    @Headers('origin') origin?: string,
  ) {
    // Approval must come from this app's own page, never from another site.
    const allowed = new URL(getFrontendUrl(this.config)).origin;
    if (origin && origin !== allowed) throw new ForbiddenException();
    try {
      return { redirect: await this.oauth.decide(userId, key, dto.allow) };
    } catch (e) {
      if (e instanceof OAuthError) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
