/** Title to show: scraped bookmarks are blank until the background fetch completes. */
export function displayTitle(bookmark) {
  if (bookmark.title) return bookmark.title;
  return bookmark.scrapeStatus === "pending" ? "Fetching details…" : "Untitled";
}
