import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Billing } from './billing.schema';
import {
  FEATURE_LABELS,
  FeatureKey,
  LIMIT_LABELS,
  LimitKey,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PlanId,
} from './plans';
import { PaymentRequiredException } from './payment-required.exception';

export interface PlanStatus {
  plan: PlanId;
  /** where Pro comes from */
  source: 'free' | 'subscription' | 'code' | 'lifetime';
  /** when Pro ends; null for free or lifetime */
  until: Date | null;
  subscriptionStatus: string;
}

type BillingFields = Pick<
  Billing,
  'subscriptionStatus' | 'subscriptionPeriodEnd' | 'grantedUntil' | 'lifetime'
>;

/** Works out the plan from what we know about a user. Pure, so it can be tested. */
export function resolvePlan(
  b: Partial<BillingFields> | null,
  now = new Date(),
): PlanStatus {
  const free: PlanStatus = {
    plan: 'free',
    source: 'free',
    until: null,
    subscriptionStatus: b?.subscriptionStatus ?? 'none',
  };
  if (!b) return free;
  if (b.lifetime)
    return { ...free, plan: 'pro', source: 'lifetime', until: null };

  const subUntil = b.subscriptionPeriodEnd ?? null;
  const subscribed =
    b.subscriptionStatus === 'active' ||
    b.subscriptionStatus === 'past_due' || // keep access while the card is retried
    (b.subscriptionStatus === 'canceled' && !!subUntil && subUntil > now);
  const codeUntil =
    b.grantedUntil && b.grantedUntil > now ? b.grantedUntil : null;

  if (subscribed && (!codeUntil || !subUntil || subUntil >= codeUntil))
    return { ...free, plan: 'pro', source: 'subscription', until: subUntil };
  if (codeUntil)
    return { ...free, plan: 'pro', source: 'code', until: codeUntil };
  return free;
}

@Injectable()
export class EntitlementsService {
  constructor(
    @InjectModel(Billing.name) private readonly billing: Model<Billing>,
  ) {}

  async status(userId: string): Promise<PlanStatus> {
    const doc = await this.billing.findOne({ userId }).lean().exec();
    return resolvePlan(doc);
  }

  async isPro(userId: string) {
    return (await this.status(userId)).plan === 'pro';
  }

  limits(plan: PlanId) {
    return PLAN_LIMITS[plan];
  }

  features(plan: PlanId) {
    return PLAN_FEATURES[plan];
  }

  /** Throws a 402 if this plan does not include the feature. */
  async assertFeature(userId: string, feature: FeatureKey) {
    const { plan } = await this.status(userId);
    if (!PLAN_FEATURES[plan][feature])
      throw new PaymentRequiredException(
        `${FEATURE_LABELS[feature]} is part of the Pro plan.`,
        `FEATURE_${feature.toUpperCase()}`,
      );
  }

  /** Throws a 402 if adding `adding` more would go over the plan's limit. */
  async assertLimit(
    userId: string,
    key: LimitKey,
    current: number,
    adding = 1,
  ) {
    const { plan } = await this.status(userId);
    const max = PLAN_LIMITS[plan][key];
    if (max != null && current + adding > max)
      throw new PaymentRequiredException(
        `The free plan includes up to ${max} ${LIMIT_LABELS[key]}. Upgrade to Pro for unlimited.`,
        `LIMIT_${key.toUpperCase()}`,
      );
  }

  /** How many more of something the plan allows (Infinity when unlimited). */
  async remaining(userId: string, key: LimitKey, current: number) {
    const { plan } = await this.status(userId);
    const max = PLAN_LIMITS[plan][key];
    return max == null ? Infinity : Math.max(0, max - current);
  }
}
