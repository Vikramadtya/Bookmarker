import { cn } from "@/lib/utils";

/** Shimmering placeholder block; size and shape come from `className`. */
export function Skeleton({ className }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/** Placeholder rows shaped like the real list and grid items. */
export function BookmarkListSkeleton({ viewMode, count = 6 }) {
  if (viewMode === "grid") {
    return (
      <div
        className="grid w-full gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        role="status"
        aria-label="Loading bookmarks"
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="mt-4 h-3 w-1/3" />
            <Skeleton className="mt-3 h-4 w-5/6" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2" role="status" aria-label="Loading bookmarks">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-10 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}
