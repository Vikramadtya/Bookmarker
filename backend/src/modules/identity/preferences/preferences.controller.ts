import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean } from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { Preferences } from './preferences.schema';
import { DigestService } from './digest.service';
import { EntitlementsService } from '@identity/billing/entitlements.service';

class UpdatePreferencesDto {
  @IsBoolean()
  digestEmail: boolean;
}

const newToken = () => randomBytes(24).toString('hex');

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1')
export class PreferencesController {
  constructor(
    @InjectModel(Preferences.name) private readonly prefs: Model<Preferences>,
    private readonly digest: DigestService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('preferences')
  @ApiOperation({
    summary: 'Your settings, including the email-to-save URL token',
  })
  async get(@CurrentUser('email') userId: string) {
    // The token is created on first use so it never exists for people who do not want it.
    const doc = await this.prefs
      .findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean()
      .exec();
    return {
      digestEmail: doc.digestEmail,
      captureToken: doc.captureToken ?? null,
    };
  }

  @Put('preferences')
  async update(
    @CurrentUser('email') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    if (dto.digestEmail)
      await this.entitlements.assertFeature(userId, 'digest');
    await this.prefs.updateOne({ userId }, { $set: dto }, { upsert: true });
    return dto;
  }

  @Post('preferences/capture-token')
  @ApiOperation({ summary: 'Create or rotate the email-to-save token' })
  async rotate(@CurrentUser('email') userId: string) {
    await this.entitlements.assertFeature(userId, 'emailIn');
    const captureToken = newToken();
    await this.prefs.updateOne(
      { userId },
      { $set: { captureToken } },
      { upsert: true },
    );
    return { captureToken };
  }

  @Get('digest')
  @ApiOperation({
    summary: 'Unread count, this week, and old links worth another look',
  })
  getDigest(@CurrentUser('email') userId: string) {
    return this.digest.build(userId);
  }
}
