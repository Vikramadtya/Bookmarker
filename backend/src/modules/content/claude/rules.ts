/**
 * The security-relevant rules of the Claude connection, free of database code so
 * they can be tested alone.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL_MS = 60 * 60_000; // one hour of access, then it is over
export const CODE_TTL_MS = 5 * 60_000;
export const REQUEST_TTL_MS = 10 * 60_000;
/**
 * How long a connection lasts. A connection alone reads nothing: it works only
 * while the user has a session open, and they can disconnect at any time.
 */
export const CONNECTION_TTL_MS = 90 * 24 * 60 * 60_000;
export const PAGE_SIZE = 50;
export const SCOPE = 'organize';

export const randomToken = () => randomBytes(32).toString('base64url');
/** Secrets are only ever stored hashed. */
export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/** PKCE S256: base64url(sha256(verifier)) must equal the challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const actual = Buffer.from(
    createHash('sha256').update(verifier).digest('base64url'),
  );
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const CLAUDE_CALLBACKS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
];

/**
 * Only Claude may receive a sign-in code: its hosted callback, or a loopback
 * address on this computer (Claude Code), on any port.
 */
export function isAllowedRedirect(uri: string, extra: string[] = []): boolean {
  if (CLAUDE_CALLBACKS.includes(uri) || extra.includes(uri)) return true;
  try {
    const u = new URL(uri);
    return (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      u.pathname === '/callback' &&
      !u.username &&
      !u.password &&
      !u.hash
    );
  } catch {
    return false;
  }
}

/** A registered redirect matches exactly, except that loopback ports may vary. */
export function redirectMatches(registered: string[], uri: string): boolean {
  if (registered.includes(uri)) return true;
  const strip = (v: string) => {
    try {
      const u = new URL(v);
      if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return v;
      u.port = '';
      return u.toString();
    } catch {
      return v;
    }
  };
  return registered.some((r) => strip(r) === strip(uri));
}

/** Query strings, fragments and credentials can hold secrets, so they are not shared. */
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname}`.slice(0, 500);
  } catch {
    return '';
  }
}

export function cleanTags(tags: unknown, max = 8): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const tag = raw
      .toLowerCase()
      .split('/')
      .map((part) => part.trim().replace(/\s+/g, '-'))
      .filter(Boolean)
      .join('/')
      .slice(0, 40);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length === max) break;
  }
  return out;
}

export const MAX_FOLDER_DEPTH = 3;

/** "Work / Reading" -> "Work/Reading"; null when it cannot be a folder path. */
export function cleanFolderPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const parts = raw
    .split('/')
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_FOLDER_DEPTH) return null;
  if (parts.some((p) => p.length > 60)) return null;
  return parts.join('/');
}

/** Compares folder paths regardless of case and spacing around "/". */
export const pathKey = (path: string) =>
  path
    .split('/')
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('/')
    .toLowerCase();

/**
 * Where a path already exists. A folder's own name may contain "/" ("AI/ML"), so
 * the longest existing prefix wins; `missing` are the levels still to create.
 */
export function matchFolderPath(
  path: string,
  existing: ReadonlyMap<string, string>,
): { parentId?: string; missing: string[] } {
  const parts = path
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  for (let n = parts.length; n > 0; n--) {
    const id = existing.get(pathKey(parts.slice(0, n).join('/')));
    if (id) return { parentId: id, missing: parts.slice(n) };
  }
  return { missing: parts };
}

export const sameTags = (a: string[], b: string[]) =>
  a.length === b.length &&
  [...a].sort().join('\n') === [...b].sort().join('\n');
