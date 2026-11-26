import { allowsFraming } from './framing';

const APP = 'https://app.example.com';

describe('allowsFraming', () => {
  it('allows pages that say nothing', () => {
    expect(allowsFraming({}, APP)).toBe(true);
  });
  it('respects X-Frame-Options', () => {
    expect(allowsFraming({ 'x-frame-options': 'DENY' }, APP)).toBe(false);
    expect(allowsFraming({ 'x-frame-options': 'SAMEORIGIN' }, APP)).toBe(false);
  });
  it('respects frame-ancestors, which overrides X-Frame-Options', () => {
    const csp = (v: string) => ({ 'content-security-policy': v });
    expect(
      allowsFraming(csp("default-src 'self'; frame-ancestors 'none'"), APP),
    ).toBe(false);
    expect(allowsFraming(csp("frame-ancestors 'self'"), APP)).toBe(false);
    expect(allowsFraming(csp(`frame-ancestors 'self' ${APP}`), APP)).toBe(true);
    expect(
      allowsFraming(
        { ...csp('frame-ancestors *'), 'x-frame-options': 'DENY' },
        APP,
      ),
    ).toBe(true);
    expect(
      allowsFraming(csp("frame-ancestors *, frame-ancestors 'none'"), APP),
    ).toBe(false);
  });
});
