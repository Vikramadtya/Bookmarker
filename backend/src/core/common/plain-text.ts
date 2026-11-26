import * as cheerio from 'cheerio';

/**
 * Page titles and descriptions as plain text: tags removed and entities turned
 * back into characters. The result is text, not HTML, so anything that puts it
 * into a page must escape it (React does; the server templates call escapeHtml).
 */
export function plainText(value: string | undefined): string {
  if (!value) return '';
  const $ = cheerio.load(value, null, false);
  $('script, style').remove();
  return $.root().text().trim();
}
