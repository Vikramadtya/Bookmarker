import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One record per user: how they pay, and any free access they were given. */
@Schema({ timestamps: true })
export class Billing {
  @Prop({ type: String, required: true, unique: true })
  userId: string;

  /** Set by the payment provider's webhooks. */
  @Prop({
    type: String,
    enum: ['none', 'active', 'past_due', 'canceled'],
    default: 'none',
  })
  subscriptionStatus: string;

  /** End of the paid period; Pro continues until then even after cancelling. */
  @Prop({ type: Date, default: null })
  subscriptionPeriodEnd: Date;

  @Prop({ type: String })
  provider?: string;

  @Prop({ type: String })
  providerCustomerId?: string;

  @Prop({ type: String })
  providerSubscriptionId?: string;

  /** Pro from access codes runs until this date. */
  @Prop({ type: Date, default: null })
  grantedUntil: Date;

  @Prop({ type: Boolean, default: false })
  lifetime: boolean;

  /** A discount code the user has entered and not yet paid with. */
  @Prop({ type: String })
  pendingDiscountCode?: string;
}

export const BillingSchema = SchemaFactory.createForClass(Billing);
