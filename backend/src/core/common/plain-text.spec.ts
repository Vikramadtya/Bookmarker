import { plainText } from './plain-text';

describe('plainText', () => {
  it('keeps ampersands and quotes as characters', () => {
    expect(plainText('Questions & Answers "quoted" it\'s')).toBe(
      'Questions & Answers "quoted" it\'s',
    );
    expect(plainText('a > b and 2 < 3')).toBe('a > b and 2 < 3');
  });
  it('decodes pages that encoded their text twice', () => {
    expect(plainText('Tips &amp; Tricks &#x2014; &quot;x&quot;')).toBe(
      'Tips & Tricks — "x"',
    );
  });
  it('removes tags and scripts', () => {
    expect(plainText('<b>Bold</b> <script>alert(1)</script>text')).toBe(
      'Bold text',
    );
  });
  it('handles nothing', () => {
    expect(plainText(undefined)).toBe('');
  });
});
