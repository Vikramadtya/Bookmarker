// Built-in smart views. A view is just a saved search: the same operators work in
// the search box (see "Search syntax" in the header).
export const BUILTIN_VIEWS = [
  {
    id: "builtin:revisit",
    name: "Revisit",
    q: "is:revisit",
    icon: "bell",
  },
  { id: "builtin:unread", name: "Unread", q: "is:unread", icon: "inbox" },
  { id: "builtin:week", name: "Saved this week", q: "saved:7d", icon: "clock" },
  {
    id: "builtin:recent",
    name: "Recently opened",
    q: "opened:30d",
    sort: "opened",
    icon: "history",
  },
  {
    id: "builtin:rediscover",
    name: "Rediscover",
    q: "is:unread older:60d",
    sort: "oldest",
    icon: "sparkles",
  },
  {
    id: "builtin:stale",
    name: "Not opened in 6 months",
    q: "stale:180d",
    sort: "opened",
    icon: "moon",
  },
  { id: "builtin:dead", name: "Dead links", q: "is:dead", icon: "alert" },
  { id: "builtin:archive", name: "Archive", q: "is:archived", icon: "archive" },
];

export const STATUS_LABELS = {
  unread: "Unread",
  reading: "Reading",
  done: "Done",
  archived: "Archived",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "site", label: "Site" },
  { value: "opened", label: "Recently opened" },
  { value: "manual", label: "Manual order" },
];

export const GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "day", label: "Day saved" },
  { value: "site", label: "Site" },
];

// Tag colors offered in the tag manager.
export const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#64748b",
];
