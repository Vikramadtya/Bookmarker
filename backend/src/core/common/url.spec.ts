import { domainOf, normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('treats tracking, scheme, www, fragment and trailing slash as noise', () => {
    const a = normalizeUrl(
      'https://www.Example.com/post/?utm_source=x&id=2#top',
    );
    const b = normalizeUrl('http://example.com/post?id=2&fbclid=abc');
    expect(a).toBe('example.com/post?id=2');
    expect(a).toBe(b);
  });

  it('keeps meaningful query parameters apart', () => {
    expect(normalizeUrl('https://a.com/p?id=1')).not.toBe(
      normalizeUrl('https://a.com/p?id=2'),
    );
  });

  it('handles the bare domain and invalid input', () => {
    expect(normalizeUrl('https://a.com/')).toBe('a.com');
    expect(normalizeUrl('not a url')).toBe('not a url');
    expect(domainOf('https://www.a.com/x')).toBe('a.com');
    expect(domainOf('nope')).toBe('');
  });
});
