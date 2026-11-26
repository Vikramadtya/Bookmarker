/** A request path that is safe to log: no query string, no one-time keys. */
export const safeLogPath = (url: string = '') =>
  url.split('?')[0].replace(/(\/organize\/connect\/)[^/]+/, '$1[redacted]');
