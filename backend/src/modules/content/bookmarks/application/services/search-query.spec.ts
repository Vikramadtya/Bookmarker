import { parseSearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it('splits operators from free text', () => {
    const p = parseSearchQuery(
      'rust ownership tag:dev site:GitHub.com is:unread saved:7d',
    );
    expect(p.text).toBe('rust ownership');
    expect(p.tags).toEqual(['dev']);
    expect(p.sites).toEqual(['github.com']);
    expect(p.statuses).toEqual(['unread']);
    expect(p.savedWithinDays).toBe(7);
  });

  it('supports quoted values, negation and flags', () => {
    const p = parseSearchQuery(
      'tag:"machine learning" -tag:old is:fav is:dead stale:180d',
    );
    expect(p.tags).toEqual(['machine learning']);
    expect(p.notTags).toEqual(['old']);
    expect([...p.flags].sort()).toEqual(['dead', 'fav']);
    expect(p.staleDays).toBe(180);
  });

  it('treats unknown operators as text', () => {
    expect(parseSearchQuery('note:this is:nonsense').text).toBe(
      'note:this is:nonsense',
    );
  });
});
