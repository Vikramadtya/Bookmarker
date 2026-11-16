import {
  couponProblem,
  extendAccess,
  generateCode,
  normalizeCode,
  priceWithDiscount,
  CouponRules,
} from './coupon-rules';
import { resolvePlan } from './entitlements.service';

const base: CouponRules = { type: 'access', active: true, redeemedCount: 0 };
const now = new Date('2026-06-01T00:00:00Z');
const day = 86_400_000;

describe('couponProblem', () => {
  it('accepts a code inside its window with uses left', () => {
    expect(
      couponProblem(
        {
          ...base,
          startsAt: new Date(+now - day),
          expiresAt: new Date(+now + day),
          maxRedemptions: 5,
          redeemedCount: 4,
        },
        now,
      ),
    ).toBeNull();
  });
  it('rejects off, early, late and used-up codes', () => {
    expect(couponProblem({ ...base, active: false }, now)).toBe('inactive');
    expect(
      couponProblem({ ...base, startsAt: new Date(+now + day) }, now),
    ).toBe('not_started');
    expect(couponProblem({ ...base, expiresAt: new Date(+now - 1) }, now)).toBe(
      'expired',
    );
    expect(
      couponProblem({ ...base, maxRedemptions: 3, redeemedCount: 3 }, now),
    ).toBe('used_up');
  });
});

describe('extendAccess', () => {
  it('starts from now when there is no access', () => {
    const r = extendAccess({ until: null, lifetime: false }, 30, now);
    expect(r.until).toEqual(new Date(+now + 30 * day));
  });
  it('stacks on access that is still running', () => {
    const running = new Date(+now + 10 * day);
    expect(
      extendAccess({ until: running, lifetime: false }, 30, now).until,
    ).toEqual(new Date(+running + 30 * day));
  });
  it('ignores access that already ended', () => {
    const ended = new Date(+now - 10 * day);
    expect(
      extendAccess({ until: ended, lifetime: false }, 7, now).until,
    ).toEqual(new Date(+now + 7 * day));
  });
  it('grants and keeps lifetime', () => {
    expect(extendAccess({ until: null, lifetime: false }, null, now)).toEqual({
      until: null,
      lifetime: true,
    });
    expect(extendAccess({ until: null, lifetime: true }, 5, now).lifetime).toBe(
      true,
    );
  });
});

describe('priceWithDiscount', () => {
  it('applies a percentage and describes how long it lasts', () => {
    expect(
      priceWithDiscount(1000, {
        percentOff: 30,
        duration: 'repeating',
        durationMonths: 3,
      }),
    ).toEqual({
      original: 1000,
      discounted: 700,
      appliesFor: 'the first 3 months',
    });
  });
  it('never goes below zero with a fixed amount', () => {
    expect(
      priceWithDiscount(500, { amountOff: 900, duration: 'once' }).discounted,
    ).toBe(0);
    expect(
      priceWithDiscount(500, { percentOff: 100, duration: 'forever' })
        .appliesFor,
    ).toBe('every payment');
  });
});

describe('codes', () => {
  it('normalizes what people type', () => {
    expect(normalizeCode('  summer 25 ')).toBe('SUMMER25');
  });
  it('generates readable codes', () => {
    expect(generateCode(() => 0, 6)).toBe('AAAAAA');
    expect(generateCode((n) => n - 1)).toMatch(/^[A-Z2-9]{10}$/);
  });
});

describe('resolvePlan', () => {
  it('is free with nothing', () =>
    expect(resolvePlan(null, now).plan).toBe('free'));
  it('is pro while granted access runs, free after', () => {
    expect(
      resolvePlan({ grantedUntil: new Date(+now + day) } as any, now),
    ).toMatchObject({ plan: 'pro', source: 'code' });
    expect(
      resolvePlan({ grantedUntil: new Date(+now - day) } as any, now).plan,
    ).toBe('free');
  });
  it('is pro for life', () =>
    expect(resolvePlan({ lifetime: true } as any, now).source).toBe(
      'lifetime',
    ));
  it('keeps a cancelled subscription until the period ends', () => {
    expect(
      resolvePlan(
        {
          subscriptionStatus: 'canceled',
          subscriptionPeriodEnd: new Date(+now + day),
        } as any,
        now,
      ).plan,
    ).toBe('pro');
    expect(
      resolvePlan(
        {
          subscriptionStatus: 'canceled',
          subscriptionPeriodEnd: new Date(+now - day),
        } as any,
        now,
      ).plan,
    ).toBe('free');
  });
});
