// Helpers that keep every cached bookmark list and detail query in sync after a
// change, so a single edit never needs to refetch whole lists.

export const bookmarkKeys = {
  all: ["bookmarks"],
  list: (params) => ["bookmarks", params],
  detail: (id) => ["bookmark", id],
};

const mapPages = (data, fn) =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: fn(page.items) })),
  };

/** Merge `patch` into the bookmark with this id wherever it is cached. */
export function patchBookmark(queryClient, id, patch) {
  queryClient.setQueriesData({ queryKey: bookmarkKeys.all }, (data) =>
    mapPages(data, (items) =>
      items.map((b) => (b.id === id ? { ...b, ...patch } : b))
    )
  );
  queryClient.setQueryData(bookmarkKeys.detail(id), (b) =>
    b ? { ...b, ...patch } : b
  );
}

export function removeBookmarks(queryClient, ids) {
  const gone = new Set(ids);
  queryClient.setQueriesData({ queryKey: bookmarkKeys.all }, (data) =>
    mapPages(data, (items) => items.filter((b) => !gone.has(b.id)))
  );
  ids.forEach((id) =>
    queryClient.removeQueries({ queryKey: bookmarkKeys.detail(id) })
  );
}

/** Find a bookmark in any cached list, used to render the detail panel instantly. */
export function findCachedBookmark(queryClient, id) {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: bookmarkKeys.all,
  })) {
    const hit = data?.pages
      ?.flatMap((page) => page.items)
      .find((b) => b.id === id);
    if (hit) return hit;
  }
  return undefined;
}
