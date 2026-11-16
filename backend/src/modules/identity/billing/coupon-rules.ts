/**
 * The rules for codes, kept free of database code so they can be tested alone.
 *
 *   access code    grants Pro for `accessDays` days (or for life) with no payment
 *   discount code  reduces the price at checkout (percent or fixed amount),
 *                  for one payment, N months, or forever
 *
 * Both kinds share: an active window (`startsAt` .. `expiresAt`), a maximum
 * number of redemptions, and an on/off switch.
 */
export type CouponType = 'access' | 'discount';
export type DiscountDuration = 'once' | 'repeating' | 'forever';

export interface CouponRules {
  type: CouponType;
  active: boolean;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  maxRedemptions?: number | null;
  redeemedCount: number;
  /** access: how many days of Pro it grants; null means for life. */
  accessDays?: number | null;
  /** discount */
  percentOff?: number | null;
  amountOff?: number | null; // minor units, e.g. cents
  duration?: DiscountDuration;
  durationMonths?: number | null;
}

export type CouponProblem =
  'inactive' | 'not_started' | 'expired' | 'used_up' | null;

/** Why a code cannot be used right now, or null when it can. */
export function couponProblem(c: CouponRules, now = new Date()): CouponProblem {
  if (!c.active) return 'inactive';
  if (c.startsAt && c.startsAt > now) return 'not_started';
  if (c.expiresAt && c.expiresAt <= now) return 'expired';
  if (c.maxRedemptions != null && c.redeemedCount >= c.maxRedemptions)
    return 'used_up';
  return null;
}

export const PROBLEM_MESSAGES: Record<Exclude<CouponProblem, null>, string> = {
  inactive: 'This code is no longer active.',
  not_started: 'This code is not active yet.',
  expired: 'This code has expired.',
  used_up: 'This code has been used the maximum number of times.',
};

const DAY_MS = 86_400_000;

/**
 * New end of Pro access after redeeming an access code. Time stacks on top of
 * any access that is still running; a lifetime grant (null) never shrinks.
 */
export function extendAccess(
  current: { until: Date | null; lifetime: boolean },
  accessDays: number | null | undefined,
  now = new Date(),
): { until: Date | null; lifetime: boolean } {
  if (current.lifetime) return current;
  if (accessDays == null) return { until: null, lifetime: true };
  const base = current.until && current.until > now ? current.until : now;
  return {
    until: new Date(base.getTime() + accessDays * DAY_MS),
    lifetime: false,
  };
}

export interface Quote {
  /** price before the code, per billing period, minor units */
  original: number;
  /** price for the first period with the code applied */
  discounted: number;
  /** how long the reduced price lasts, in words */
  appliesFor: string;
}

const MIN_CHARGE = 0;

/** Price of one billing period after applying a discount code. */
export function priceWithDiscount(
  original: number,
  c: Pick<
    CouponRules,
    'percentOff' | 'amountOff' | 'duration' | 'durationMonths'
  >,
): Quote {
  let discounted = original;
  if (c.percentOff) discounted = original - (original * c.percentOff) / 100;
  else if (c.amountOff) discounted = original - c.amountOff;
  discounted = Math.max(MIN_CHARGE, Math.round(discounted));

  const appliesFor =
    c.duration === 'forever'
      ? 'every payment'
      : c.duration === 'repeating' && c.durationMonths
        ? `the first ${c.durationMonths} month${c.durationMonths === 1 ? '' : 's'}`
        : 'your first payment';
  return { original, discounted, appliesFor };
}

/** Codes are typed by hand, so make them forgiving: trim, upper-case, no stray spaces. */
export const normalizeCode = (raw: string) =>
  raw.trim().toUpperCase().replace(/\s+/g, '');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function generateCode(
  random: (max: number) => number,
  length = 10,
): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[random(ALPHABET.length)];
  return out;
}
