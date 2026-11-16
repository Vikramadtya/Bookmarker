import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Coupon {
  /** Stored upper-case; unique. */
  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: ['access', 'discount'], required: true })
  type: string;

  @Prop({ type: String, default: '', maxlength: 200 })
  note: string;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  /** Redeemable from / until. Both optional. */
  @Prop({ type: Date, default: null })
  startsAt: Date;

  @Prop({ type: Date, default: null })
  expiresAt: Date;

  /** null: unlimited. */
  @Prop({ type: Number, default: null })
  maxRedemptions: number;

  @Prop({ type: Number, default: 0 })
  redeemedCount: number;

  // access codes
  @Prop({ type: Number, default: null })
  accessDays: number;

  // discount codes
  @Prop({ type: Number, default: null })
  percentOff: number;

  @Prop({ type: Number, default: null })
  amountOff: number;

  @Prop({
    type: String,
    enum: ['once', 'repeating', 'forever'],
    default: 'once',
  })
  duration: string;

  @Prop({ type: Number, default: null })
  durationMonths: number;

  @Prop({ type: String })
  createdBy?: string;
}
export const CouponSchema = SchemaFactory.createForClass(Coupon);

/** Who used which code. The unique index is what makes "once per person" safe. */
@Schema({ timestamps: true })
export class CouponRedemption {
  @Prop({ type: String, required: true })
  couponId: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  type: string;

  /** access codes: when the granted Pro ends (null = lifetime) */
  @Prop({ type: Date, default: null })
  accessUntil: Date;
}
export const CouponRedemptionSchema =
  SchemaFactory.createForClass(CouponRedemption);
CouponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });
