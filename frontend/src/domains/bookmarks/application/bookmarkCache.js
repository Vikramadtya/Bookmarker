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

/** The cached manual-order list that contains both bookmarks, flattened. */
function manualListWith(queryClient, ...ids) {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: bookmarkKeys.all,
    predicate: (query) => query.queryKey[1]?.sort === "manual",
  })) {
    const items = data?.pages?.flatMap((page) => page.items);
    if (items && ids.every((id) => items.some((b) => b.id === id)))
      return items;
  }
  return null;
}

/**
 * Position that puts `activeId` where `overId` is, between its new neighbours.
 * Returns null when the two are not in the same cached manual list.
 */
export function positionForDrop(queryClient, activeId, overId) {
  const items = manualListWith(queryClient, activeId, overId);
  if (!items) return null;
  const from = items.findIndex((b) => b.id === activeId);
  const to = items.findIndex((b) => b.id === overId);
  const rest = items.filter((b) => b.id !== activeId);
  const overIndex = rest.findIndex((b) => b.id === overId);
  // Moving up lands before the target, moving down lands after it.
  const [prev, next] =
    from > to
      ? [rest[overIndex - 1], rest[overIndex]]
      : [rest[overIndex], rest[overIndex + 1]];
  if (prev && next) return (prev.position + next.position) / 2;
  if (prev) return prev.position + 1;
  return next.position - 1;
}

/** Re-sorts every cached manual-order list after a bookmark's position changed. */
export function resortManualLists(queryClient) {
  queryClient.setQueriesData(
    {
      queryKey: bookmarkKeys.all,
      predicate: (query) => query.queryKey[1]?.sort === "manual",
    },
    (data) => {
      if (!data?.pages) return data;
      const sizes = data.pages.map((p) => p.items.length);
      const sorted = data.pages
        .flatMap((p) => p.items)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
      let at = 0;
      return {
        ...data,
        pages: data.pages.map((page, i) => {
          const items = sorted.slice(at, at + sizes[i]);
          at += sizes[i];
          return { ...page, items };
        }),
      };
    }
  );
}
