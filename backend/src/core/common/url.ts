const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
  'ref_src',
  'ref_url',
  '_hsenc',
  '_hsmi',
  'yclid',
  'si',
]);

const isTracking = (key: string) =>
  key.toLowerCase().startsWith('utm_') ||
  TRACKING_PARAMS.has(key.toLowerCase());

/** Lowercase hostname without a leading "www."; '' when the URL is invalid. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Key for spotting the same page saved twice: ignores the scheme, "www.", the
 * #fragment, tracking parameters, parameter order and a trailing slash.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const params = [...parsed.searchParams.entries()]
      .filter(([key]) => !isTracking(key))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length
      ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&')
      : '';
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${domainOf(url)}${path}${query}`;
  } catch {
    return url.trim().toLowerCase();
  }
}
