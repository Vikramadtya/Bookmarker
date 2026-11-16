import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksModule } from '@content/bookmarks/bookmarks.module';
import { FoldersModule } from '@workspace/folders/folders.module';
import { SavedView, SavedViewSchema } from '@workspace/views/saved-view.schema';
import { Billing, BillingSchema } from './billing.schema';
import {
  Coupon,
  CouponRedemption,
  CouponRedemptionSchema,
  CouponSchema,
} from './coupon.schema';
import { EntitlementsService } from './entitlements.service';
import { CouponsService } from './coupons.service';
import { BillingController } from './billing.controller';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

/** Global so any module can ask "does this user's plan allow it?" without importing this one. */
@Global()
@Module({
  imports: [
    BookmarksModule,
    FoldersModule,
    MongooseModule.forFeature([
      { name: Billing.name, schema: BillingSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponRedemption.name, schema: CouponRedemptionSchema },
      { name: SavedView.name, schema: SavedViewSchema },
    ]),
  ],
  controllers: [BillingController, AdminController],
  providers: [EntitlementsService, CouponsService, AdminGuard],
  exports: [EntitlementsService, CouponsService],
})
export class BillingModule {}
