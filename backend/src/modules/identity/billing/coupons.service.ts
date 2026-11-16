import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'node:crypto';
import { Billing } from './billing.schema';
import { Coupon, CouponRedemption } from './coupon.schema';
import {
  CouponRules,
  PROBLEM_MESSAGES,
  couponProblem,
  extendAccess,
  generateCode,
  normalizeCode,
  priceWithDiscount,
} from './coupon-rules';

const NOT_VALID = 'That code is not valid.';

export interface CreateCouponInput {
  type: 'access' | 'discount';
  code?: string;
  note?: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  accessDays?: number | null;
  lifetime?: boolean;
  percentOff?: number | null;
  amountOff?: number | null;
  duration?: 'once' | 'repeating' | 'forever';
  durationMonths?: number | null;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly coupons: Model<Coupon>,
    @InjectModel(CouponRedemption.name)
    private readonly redemptions: Model<CouponRedemption>,
    @InjectModel(Billing.name) private readonly billing: Model<Billing>,
  ) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  async create(adminId: string, input: CreateCouponInput) {
    const doc: Record<string, any> = {
      type: input.type,
      note: input.note ?? '',
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      maxRedemptions: input.maxRedemptions ?? null,
      createdBy: adminId,
    };
    if (doc.startsAt && doc.expiresAt && doc.expiresAt <= doc.startsAt)
      throw new BadRequestException(
        'The end date must be after the start date.',
      );

    if (input.type === 'access') {
      if (!input.lifetime && !input.accessDays)
        throw new BadRequestException(
          'Say how long the access lasts, or make it lifetime.',
        );
      doc.accessDays = input.lifetime ? null : input.accessDays!;
    } else {
      const hasPercent = !!input.percentOff;
      const hasAmount = !!input.amountOff;
      if (hasPercent === hasAmount)
        throw new BadRequestException(
          'Give either a percentage or a fixed amount off.',
        );
      doc.percentOff = input.percentOff ?? null;
      doc.amountOff = input.amountOff ?? null;
      doc.duration = input.duration ?? 'once';
      if (doc.duration === 'repeating' && !input.durationMonths)
        throw new BadRequestException(
          'Say how many months the discount lasts.',
        );
      doc.durationMonths =
        doc.duration === 'repeating' ? input.durationMonths! : null;
    }

    const code = input.code
      ? normalizeCode(input.code)
      : generateCode((n) => randomInt(n));
    if (!/^[A-Z0-9_-]{4,32}$/.test(code))
      throw new BadRequestException(
        'Codes are 4 to 32 letters, numbers, dashes or underscores.',
      );
    try {
      return this.present(await this.coupons.create({ ...doc, code }));
    } catch (e: any) {
      if (e?.code === 11000)
        throw new ConflictException('A code with that name already exists.');
      throw e;
    }
  }

  async list() {
    const docs = await this.coupons
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((c) => this.present(c));
  }

  async update(
    id: string,
    patch: {
      active?: boolean;
      note?: string;
      startsAt?: string | null;
      expiresAt?: string | null;
      maxRedemptions?: number | null;
    },
  ) {
    const set: Record<string, unknown> = {};
    if (patch.active !== undefined) set.active = patch.active;
    if (patch.note !== undefined) set.note = patch.note;
    if (patch.startsAt !== undefined)
      set.startsAt = patch.startsAt ? new Date(patch.startsAt) : null;
    if (patch.expiresAt !== undefined)
      set.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
    if (patch.maxRedemptions !== undefined)
      set.maxRedemptions = patch.maxRedemptions;
    const doc = await this.coupons
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Code not found');
    return this.present(doc);
  }

  async redemptionsFor(id: string) {
    const rows = await this.redemptions
      .find({ couponId: id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
    return rows.map((r: any) => ({
      userId: r.userId,
      at: r.createdAt,
      accessUntil: r.accessUntil ?? null,
    }));
  }

  /** Removing a code that was used would erase the record of who used it. */
  async remove(id: string) {
    if (await this.redemptions.exists({ couponId: id }))
      throw new ConflictException(
        'This code has been used. Switch it off instead of deleting it.',
      );
    await this.coupons.deleteOne({ _id: id });
  }

  // ─── People ───────────────────────────────────────────────────────────────

  private async findValid(rawCode: string) {
    const code = normalizeCode(rawCode ?? '');
    const coupon = code
      ? await this.coupons.findOne({ code }).lean().exec()
      : null;
    // Unknown and unusable codes read the same so codes cannot be guessed at.
    if (!coupon) throw new NotFoundException(NOT_VALID);
    const problem = couponProblem(coupon as unknown as CouponRules);
    if (problem) throw new BadRequestException(PROBLEM_MESSAGES[problem]);
    return coupon;
  }

  /** Reserves one use of the code, atomically, so the limit holds under load. */
  private async claim(coupon: Coupon & { _id: unknown }, userId: string) {
    const now = new Date();
    const claimed = await this.coupons
      .findOneAndUpdate(
        {
          _id: coupon._id,
          active: true,
          $and: [
            { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
            { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
            {
              $or: [
                { maxRedemptions: null },
                { $expr: { $lt: ['$redeemedCount', '$maxRedemptions'] } },
              ],
            },
          ],
        },
        { $inc: { redeemedCount: 1 } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
    if (!claimed) {
      // Lost a race for the last use, or it just expired.
      const fresh = await this.coupons.findById(coupon._id).lean().exec();
      const problem = fresh && couponProblem(fresh as unknown as CouponRules);
      throw new BadRequestException(
        problem ? PROBLEM_MESSAGES[problem] : NOT_VALID,
      );
    }
    return claimed;
  }

  private async record(
    coupon: { _id: unknown; code: string; type: string },
    userId: string,
    accessUntil: Date | null,
  ) {
    try {
      await this.redemptions.create({
        couponId: String(coupon._id),
        code: coupon.code,
        userId,
        type: coupon.type,
        accessUntil: accessUntil as Date,
      } as never);
    } catch (e: any) {
      // Already used by this person: give the reserved use back.
      await this.coupons.updateOne(
        { _id: coupon._id },
        { $inc: { redeemedCount: -1 } },
      );
      if (e?.code === 11000)
        throw new ConflictException('You have already used this code.');
      throw e;
    }
  }

  /** One box for both kinds: access codes unlock Pro now, discount codes wait for checkout. */
  async redeem(userId: string, rawCode: string) {
    const coupon = await this.findValid(rawCode);
    return coupon.type === 'access'
      ? this.redeemAccess(userId, rawCode)
      : this.applyDiscount(userId, rawCode);
  }

  /** Redeems an access code: Pro, with no payment, for the length the code allows. */
  async redeemAccess(userId: string, rawCode: string) {
    const coupon = await this.findValid(rawCode);
    if (coupon.type !== 'access')
      throw new BadRequestException(
        'That is a discount code. Enter it when you upgrade.',
      );
    if (await this.redemptions.exists({ couponId: String(coupon._id), userId }))
      throw new ConflictException('You have already used this code.');

    const claimed = await this.claim(coupon, userId);
    const current = await this.billing.findOne({ userId }).lean().exec();
    const next = extendAccess(
      { until: current?.grantedUntil ?? null, lifetime: !!current?.lifetime },
      claimed.accessDays,
    );
    await this.record(claimed, userId, next.lifetime ? null : next.until);
    await this.billing.updateOne(
      { userId },
      { $set: { grantedUntil: next.until, lifetime: next.lifetime } },
      { upsert: true },
    );
    return {
      type: 'access' as const,
      until: next.until,
      lifetime: next.lifetime,
    };
  }

  /** Checks a discount code and remembers it for checkout. Uses are counted at payment. */
  async applyDiscount(userId: string, rawCode: string) {
    const coupon = await this.findValid(rawCode);
    if (coupon.type !== 'discount')
      throw new BadRequestException(
        'That is an access code. Redeem it to unlock Pro directly.',
      );
    if (await this.redemptions.exists({ couponId: String(coupon._id), userId }))
      throw new ConflictException('You have already used this code.');
    await this.billing.updateOne(
      { userId },
      { $set: { pendingDiscountCode: coupon.code } },
      { upsert: true },
    );
    return { type: 'discount' as const, ...this.describeDiscount(coupon) };
  }

  async clearDiscount(userId: string) {
    await this.billing.updateOne(
      { userId },
      { $unset: { pendingDiscountCode: '' } },
    );
  }

  /** To be called once a payment using the discount has gone through. */
  async consumeDiscount(userId: string, rawCode: string) {
    const coupon = await this.findValid(rawCode);
    if (coupon.type !== 'discount') throw new BadRequestException(NOT_VALID);
    const claimed = await this.claim(coupon, userId);
    await this.record(claimed, userId, null);
    await this.clearDiscount(userId);
  }

  /** Price of one period for this user, with the code they entered if any. */
  async quote(userId: string, original: number, rawCode?: string) {
    if (!rawCode) return { code: null, ...priceWithDiscount(original, {}) };
    const coupon = await this.findValid(rawCode);
    if (coupon.type !== 'discount')
      throw new BadRequestException(
        'That is an access code. Redeem it to unlock Pro directly.',
      );
    if (await this.redemptions.exists({ couponId: String(coupon._id), userId }))
      throw new ConflictException('You have already used this code.');
    return {
      code: coupon.code,
      ...priceWithDiscount(original, coupon as unknown as CouponRules),
    };
  }

  private describeDiscount(c: Coupon) {
    return {
      code: c.code,
      percentOff: c.percentOff ?? null,
      amountOff: c.amountOff ?? null,
      duration: c.duration,
      durationMonths: c.durationMonths ?? null,
    };
  }

  private present(c: any) {
    const problem = couponProblem(c as CouponRules);
    return {
      id: String(c._id),
      code: c.code,
      type: c.type,
      note: c.note ?? '',
      active: c.active,
      startsAt: c.startsAt ?? null,
      expiresAt: c.expiresAt ?? null,
      maxRedemptions: c.maxRedemptions ?? null,
      redeemedCount: c.redeemedCount ?? 0,
      accessDays: c.accessDays ?? null,
      lifetime: c.type === 'access' && c.accessDays == null,
      percentOff: c.percentOff ?? null,
      amountOff: c.amountOff ?? null,
      duration: c.duration,
      durationMonths: c.durationMonths ?? null,
      /** why it cannot be used right now, if so */
      status: problem ?? 'usable',
      createdAt: c.createdAt,
    };
  }
}
