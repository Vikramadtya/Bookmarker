import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotImplementedException,
  Optional,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { BookmarksService } from '@content/bookmarks/application/services/bookmarks.service';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { SavedView } from '@workspace/views/saved-view.schema';
import { Billing } from './billing.schema';
import { CouponsService } from './coupons.service';
import { EntitlementsService } from './entitlements.service';
import { isAdmin } from './admin.guard';
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  PLAN_FEATURES,
  PLAN_LIMITS,
} from './plans';
import { PAYMENT_PROVIDER } from './payment.provider';
import type { PaymentProvider } from './payment.provider';

class CodeDto {
  @IsString()
  @MaxLength(64)
  code: string;
}

class QuoteDto {
  @IsIn(['monthly', 'yearly'])
  plan: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/billing')
export class BillingController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly coupons: CouponsService,
    private readonly bookmarks: BookmarksService,
    private readonly folders: FoldersService,
    private readonly config: ConfigService,
    @InjectModel(SavedView.name) private readonly views: Model<SavedView>,
    @InjectModel(Billing.name) private readonly billing: Model<Billing>,
    @Optional()
    @Inject(PAYMENT_PROVIDER)
    private readonly provider?: PaymentProvider,
  ) {}

  /** Prices in minor units (cents). Override with the PRICE_* environment variables. */
  private prices() {
    const n = (key: string, fallback: number) =>
      Number(this.config.get(key)) || fallback;
    return {
      currency: this.config.get<string>('PRICE_CURRENCY') ?? 'USD',
      monthly: n('PRICE_MONTHLY', 499),
      yearly: n('PRICE_YEARLY', 3999),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Your plan, what it includes, and what you have used',
  })
  async overview(
    @CurrentUser('email') userId: string,
    @CurrentUser('email') email: string,
  ) {
    const status = await this.entitlements.status(userId);
    const [bookmarks, folders, views, billing] = await Promise.all([
      this.bookmarks.countAll(userId),
      this.folders.countOwned(userId),
      this.views.countDocuments({ userId }),
      this.billing.findOne({ userId }).lean().exec(),
    ]);
    return {
      plan: status.plan,
      source: status.source,
      until: status.until,
      subscriptionStatus: status.subscriptionStatus,
      limits: PLAN_LIMITS[status.plan],
      features: PLAN_FEATURES[status.plan],
      usage: { bookmarks, folders, views },
      // What the Pro plan adds, for the upgrade screen.
      freeLimits: PLAN_LIMITS.free,
      labels: { limits: LIMIT_LABELS, features: FEATURE_LABELS },
      prices: this.prices(),
      pendingDiscountCode: billing?.pendingDiscountCode ?? null,
      paymentsEnabled: !!this.provider,
      isAdmin: isAdmin(this.config, email),
    };
  }

  @Post('redeem')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Enter a code: access codes unlock Pro now, discount codes apply at checkout',
  })
  async redeem(@CurrentUser('email') userId: string, @Body() dto: CodeDto) {
    return this.coupons.redeem(userId, dto.code);
  }

  @Delete('discount')
  @HttpCode(204)
  @ApiOperation({ summary: 'Forget the discount code entered for checkout' })
  async clearDiscount(@CurrentUser('email') userId: string) {
    await this.coupons.clearDiscount(userId);
  }

  @Post('quote')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'The price of a plan with an optional discount code',
  })
  async quote(@CurrentUser('email') userId: string, @Body() dto: QuoteDto) {
    const prices = this.prices();
    const billing = await this.billing.findOne({ userId }).lean().exec();
    const quote = await this.coupons.quote(
      userId,
      prices[dto.plan],
      dto.code ?? billing?.pendingDiscountCode,
    );
    return { plan: dto.plan, currency: prices.currency, ...quote };
  }

  @Post('checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a payment with the configured provider' })
  async checkout(@CurrentUser('email') userId: string, @Body() dto: QuoteDto) {
    if (!this.provider)
      throw new NotImplementedException(
        'Payments are not set up yet. If you have an access code, enter it instead.',
      );
    const billing = await this.billing.findOne({ userId }).lean().exec();
    const frontend = this.config.get<string>('FRONTEND_URL') ?? '';
    return this.provider.createCheckout({
      userId,
      plan: dto.plan,
      discountCode: dto.code ?? billing?.pendingDiscountCode ?? null,
      successUrl: `${frontend}/?billing=success`,
      cancelUrl: `${frontend}/?billing=cancelled`,
    });
  }
}
