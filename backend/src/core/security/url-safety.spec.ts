import { assertSafeUrl, isPrivateIp } from './url-safety';

describe('url-safety', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111'])(
    'treats %s as public',
    (ip) => {
      expect(isPrivateIp(ip)).toBe(false);
    },
  );

  it('rejects non-http protocols', () => {
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow();
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow();
    expect(() => assertSafeUrl('ftp://example.com')).toThrow();
  });

  it('rejects private IP literals', () => {
    expect(() =>
      assertSafeUrl('http://169.254.169.254/latest/meta-data'),
    ).toThrow();
    expect(() => assertSafeUrl('http://[::1]/')).toThrow();
  });

  it('accepts ordinary public URLs', () => {
    expect(assertSafeUrl('https://example.com/a?b=1').hostname).toBe(
      'example.com',
    );
  });
});
