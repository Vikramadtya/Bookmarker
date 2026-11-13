/**
 * Search syntax, e.g.  rust tag:dev/rust site:github.com is:unread saved:7d
 *
 *   tag:x        has the tag x (or a nested tag below it, x/...)
 *   -tag:x       does not have it
 *   site:x       from the domain x (subdomains included)
 *   is:...       unread | reading | done | archived | fav | pinned | dead | article | revisit | due
 *   saved:Nd     saved within the last N days
 *   older:Nd     saved more than N days ago
 *   opened:Nd    opened within the last N days
 *   stale:Nd     not opened for N days
 *
 * Quote values with spaces: tag:"machine learning". Anything else is free text.
 */
export const STATUSES = ['unread', 'reading', 'done', 'archived'] as const;
export type Status = (typeof STATUSES)[number];

export interface ParsedQuery {
  text: string;
  tags: string[];
  notTags: string[];
  sites: string[];
  statuses: Status[];
  flags: Set<'fav' | 'pinned' | 'dead' | 'article' | 'revisit' | 'due'>;
  savedWithinDays?: number;
  olderThanDays?: number;
  openedWithinDays?: number;
  staleDays?: number;
}

const TOKEN = /(-?[a-z]+):("[^"]*"|\S+)|"[^"]*"|\S+/gi;
const unquote = (v: string) => v.replace(/^"|"$/g, '');
const days = (v: string) => {
  const m = /^(\d{1,5})d?$/i.exec(v);
  return m ? Number(m[1]) : undefined;
};

export function parseSearchQuery(input: string): ParsedQuery {
  const parsed: ParsedQuery = {
    text: '',
    tags: [],
    notTags: [],
    sites: [],
    statuses: [],
    flags: new Set(),
  };
  const words: string[] = [];

  for (const match of input.matchAll(TOKEN)) {
    const [raw, key, rawValue] = match;
    if (!key) {
      words.push(unquote(raw));
      continue;
    }
    const value = unquote(rawValue);
    const op = key.toLowerCase();
    let handled = true;

    if (op === 'tag' && value) parsed.tags.push(value);
    else if (op === '-tag' && value) parsed.notTags.push(value);
    else if (op === 'site' && value) parsed.sites.push(value.toLowerCase());
    else if (op === 'is') {
      const v = value.toLowerCase();
      if ((STATUSES as readonly string[]).includes(v))
        parsed.statuses.push(v as Status);
      else if (v === 'fav' || v === 'favorite') parsed.flags.add('fav');
      else if (v === 'pinned') parsed.flags.add('pinned');
      else if (v === 'dead') parsed.flags.add('dead');
      else if (v === 'article') parsed.flags.add('article');
      else if (v === 'revisit') parsed.flags.add('revisit');
      else if (v === 'due') parsed.flags.add('due');
      else handled = false;
    } else if (op === 'saved' && days(value) !== undefined)
      parsed.savedWithinDays = days(value);
    else if (op === 'older' && days(value) !== undefined)
      parsed.olderThanDays = days(value);
    else if (op === 'opened' && days(value) !== undefined)
      parsed.openedWithinDays = days(value);
    else if (op === 'stale' && days(value) !== undefined)
      parsed.staleDays = days(value);
    else handled = false;

    if (!handled) words.push(raw); // an unknown "word:word" is just text
  }

  parsed.text = words.join(' ').trim();
  return parsed;
}
