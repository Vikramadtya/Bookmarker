import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';

const MAX_REDIRECTS = 5;

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True for loopback, link-local, private, multicast and otherwise non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version !== 6) return true;

  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb') ||
    lower.startsWith('ff')
  );
}

/**
 * dns.lookup replacement that rejects private addresses. Because the check
 * runs on the address the socket actually connects to, DNS rebinding cannot
 * swap in an internal IP after validation.
 */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as any)(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateIp(a.address))) {
      return (callback as any)(new Error('Blocked address'));
    }
    if ((options as dns.LookupOptions).all)
      return (callback as any)(null, list);
    (callback as any)(null, list[0].address, list[0].family);
  });
};

/** Throws unless the URL is plain http(s) and is not an IP literal in a private range. */
export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error('Blocked address');
  }
  return url;
}

export interface SafeResponse {
  status: number;
  url: string;
  body: string;
}

export interface SafeRequestOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
}

/**
 * Minimal SSRF-resistant HTTP client: http(s) only, validated on every
 * redirect hop, connection-time IP check, bounded time and body size.
 */
export async function safeRequest(
  rawUrl: string,
  {
    method = 'GET',
    timeoutMs = 8000,
    maxBytes = 2_000_000,
    headers = {},
  }: SafeRequestOptions = {},
): Promise<SafeResponse> {
  let current = assertSafeUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await requestOnce(
      current,
      method,
      timeoutMs,
      maxBytes,
      headers,
    );
    if (result.redirectTo) {
      current = assertSafeUrl(new URL(result.redirectTo, current).toString());
      continue;
    }
    return {
      status: result.status,
      url: current.toString(),
      body: result.body,
    };
  }
  throw new Error('Too many redirects');
}

function requestOnce(
  url: URL,
  method: string,
  timeoutMs: number,
  maxBytes: number,
  headers: Record<string, string>,
): Promise<{ status: number; body: string; redirectTo?: string }> {
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method,
        lookup: safeLookup,
        timeout: timeoutMs,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; BookmarkerBot/1.0)',
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          ...headers,
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({
            status,
            body: '',
            redirectTo: res.headers.location,
          });
        }
        if (method === 'HEAD') {
          res.resume();
          return resolve({ status, body: '' });
        }

        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            // Keep what we have: metadata lives in <head>, near the start.
            req.destroy();
            return resolve({
              status,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({ status, body: Buffer.concat(chunks).toString('utf8') }),
        );
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}
