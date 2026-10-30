import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** Title to show: scraped bookmarks are blank until the background fetch completes. */
export function displayTitle(bookmark) {
  if (bookmark.title) return bookmark.title;
  return bookmark.scrapeStatus === "pending" ? "Fetching details…" : "Untitled";
}

export const isPending = (bookmark) => bookmark.scrapeStatus === "pending";

export function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url ?? "";
  }
}

export const timeAgo = (date) => (date ? dayjs(date).fromNow() : "");

/** A stable hue per site, so cards without a preview image still look distinct. */
export function hueFor(text = "") {
  let hash = 0;
  for (let i = 0; i < text.length; i++)
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}
