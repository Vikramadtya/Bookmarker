import type { IncomingHttpHeaders } from 'node:http';
import { safeRequest } from './url-safety';

/**
 * Whether a page lets another site show it in a frame, judged from its response
 * headers. Browsers enforce this, so the app can only explain it, not bypass it.
 */
export function allowsFraming(
  headers: IncomingHttpHeaders,
  appOrigin: string,
): boolean {
  const csp = [headers['content-security-policy'] ?? []].flat().join(',');
  // Several policies may be sent; every one with frame-ancestors must allow us.
  const ancestors = csp
    .split(',')
    .flatMap((policy) => policy.split(';'))
    .map((d) => d.trim().toLowerCase().split(/\s+/))
    .filter(([name]) => name === 'frame-ancestors');
  if (ancestors.length > 0) {
    const app = appOrigin.toLowerCase();
    // When frame-ancestors is present, browsers ignore X-Frame-Options.
    return ancestors.every(([, ...sources]) =>
      sources.some((s) => s === '*' || s === 'https:' || s === app),
    );
  }
  return !headers['x-frame-options'];
}

/** true / false when the page answered, null when it could not be checked. */
export async function checkEmbeddable(
  url: string,
  appOrigin: string,
): Promise<boolean | null> {
  // An insecure page cannot be framed by a secure app.
  if (url.startsWith('http://') && appOrigin.startsWith('https://'))
    return false;
  try {
    const res = await safeRequest(url, { timeoutMs: 6000, maxBytes: 1024 });
    const allowed = allowsFraming(res.headers, appOrigin);
    // An error page (often a bot check) only proves something when it refuses.
    return res.status >= 400 && allowed ? null : allowed;
  } catch {
    return null;
  }
}
