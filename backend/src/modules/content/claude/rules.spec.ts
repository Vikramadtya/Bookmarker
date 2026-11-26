import { createHash } from 'node:crypto';
import {
  cleanFolderPath,
  cleanTags,
  matchFolderPath,
  isAllowedRedirect,
  redirectMatches,
  safeUrl,
  verifyPkce,
} from './rules';

describe('verifyPkce', () => {
  const verifier = 'a'.repeat(50);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  it('accepts the matching verifier only', () => {
    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce('b'.repeat(50), challenge)).toBe(false);
    expect(verifyPkce('short', challenge)).toBe(false);
  });
});

describe('redirects', () => {
  it('allows Claude and loopback callbacks', () => {
    expect(isAllowedRedirect('https://claude.ai/api/mcp/auth_callback')).toBe(
      true,
    );
    expect(isAllowedRedirect('http://localhost:3118/callback')).toBe(true);
    expect(isAllowedRedirect('http://127.0.0.1/callback')).toBe(true);
  });
  it('rejects everything else', () => {
    for (const bad of [
      'https://evil.example.com/callback',
      'https://claude.ai.evil.com/api/mcp/auth_callback',
      'https://claude.ai/api/mcp/auth_callback?next=x',
      'http://localhost.evil.com/callback',
      'http://user@localhost/callback',
      'http://localhost/other',
      'javascript:alert(1)',
    ])
      expect(isAllowedRedirect(bad)).toBe(false);
  });
  it('lets only the loopback port vary', () => {
    expect(
      redirectMatches(
        ['http://localhost/callback'],
        'http://localhost:5000/callback',
      ),
    ).toBe(true);
    expect(
      redirectMatches(
        ['https://claude.ai/api/mcp/auth_callback'],
        'http://localhost/callback',
      ),
    ).toBe(false);
  });
});

describe('cleaning', () => {
  it('drops secrets from addresses', () => {
    expect(safeUrl('https://u:p@x.com/a/b?token=1#frag')).toBe(
      'https://x.com/a/b',
    );
  });
  it('normalizes tags', () => {
    expect(
      cleanTags([' Dev / Rust ', 'dev/rust', 'Machine Learning', 3, '']),
    ).toEqual(['dev/rust', 'machine-learning']);
  });
  it('accepts sensible folder paths only', () => {
    expect(cleanFolderPath(' Work /  Reading ')).toBe('Work/Reading');
    expect(cleanFolderPath('a/b/c/d')).toBeNull();
    expect(cleanFolderPath('///')).toBeNull();
  });
});

describe('matchFolderPath', () => {
  const existing = new Map([
    ['links', 'L'],
    ['links/ai/ml', 'AIML'], // one folder whose name is "AI/ML"
  ]);
  it('finds a folder whose name contains a slash', () => {
    expect(matchFolderPath('Links/AI/ML', existing)).toEqual({
      parentId: 'AIML',
      missing: [],
    });
    expect(matchFolderPath('links / AI / ML', existing).parentId).toBe('AIML');
  });
  it('creates only what is missing', () => {
    expect(matchFolderPath('Links/Rust/Async', existing)).toEqual({
      parentId: 'L',
      missing: ['Rust', 'Async'],
    });
    expect(matchFolderPath('Links/AI/ML/Papers', existing)).toEqual({
      parentId: 'AIML',
      missing: ['Papers'],
    });
    expect(matchFolderPath('New', existing)).toEqual({ missing: ['New'] });
  });
});
