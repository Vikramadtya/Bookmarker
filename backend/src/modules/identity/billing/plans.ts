/**
 * What each plan includes. `null` means unlimited. This is the single place to
 * change limits: the API enforces them, and the app reads them from /billing.
 */
export type PlanId = 'free' | 'pro';
export type LimitKey = 'bookmarks' | 'folders' | 'views';
export type FeatureKey = 'sharing' | 'ai' | 'digest' | 'emailIn';

export const PLAN_LIMITS: Record<PlanId, Record<LimitKey, number | null>> = {
  free: { bookmarks: 200, folders: 5, views: 3 },
  pro: { bookmarks: null, folders: null, views: null },
};

export const PLAN_FEATURES: Record<PlanId, Record<FeatureKey, boolean>> = {
  free: { sharing: false, ai: false, digest: false, emailIn: false },
  pro: { sharing: true, ai: true, digest: true, emailIn: true },
};

export const LIMIT_LABELS: Record<LimitKey, string> = {
  bookmarks: 'bookmarks',
  folders: 'collections',
  views: 'saved views',
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  sharing: 'Public sharing and RSS',
  ai: 'AI summaries and tag suggestions',
  digest: 'The weekly digest email',
  emailIn: 'Email-to-save',
};
