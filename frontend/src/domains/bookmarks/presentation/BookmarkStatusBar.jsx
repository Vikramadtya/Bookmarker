import { Archive, BookOpenCheck, Circle, Moon, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/viewDefs";
import { useUpdateBookmark } from "@/domains/bookmarks/application/useBookmarks";

const STATUS_ICONS = {
  unread: Circle,
  reading: BookOpenCheck,
  done: BookOpenCheck,
  archived: Archive,
};
const ORDER = ["unread", "reading", "done", "archived"];
const SNOOZE_DAYS = 7;

/** Read status, pin and snooze for one bookmark. */
export default function BookmarkStatusBar({ bookmark }) {
  const { mutate: update } = useUpdateBookmark();
  const snoozed =
    bookmark.snoozedUntil && new Date(bookmark.snoozedUntil) > new Date();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Read status"
        className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900"
      >
        {ORDER.map((status) => {
          const Icon = STATUS_ICONS[status];
          const active = bookmark.status === status;
          return (
            <button
              key={status}
              role="radio"
              aria-checked={active}
              onClick={() => update({ id: bookmark.id, data: { status } })}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                active
                  ? "shadow-soft bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Icon
                className={cn(
                  "h-3 w-3",
                  status === "unread" && active && "fill-blue-500 text-blue-500"
                )}
              />
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      <button
        onClick={() =>
          update({ id: bookmark.id, data: { pinned: !bookmark.pinned } })
        }
        aria-pressed={bookmark.pinned}
        title="Pin to the top of its folder (P)"
        className={cn(
          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
          bookmark.pinned
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
        )}
      >
        <Pin className={cn("h-3 w-3", bookmark.pinned && "fill-current")} />
        {bookmark.pinned ? "Pinned" : "Pin"}
      </button>

      {bookmark.status === "unread" && (
        <button
          onClick={() =>
            update({
              id: bookmark.id,
              data: {
                snoozedUntil: snoozed
                  ? null
                  : new Date(
                      Date.now() + SNOOZE_DAYS * 86_400_000
                    ).toISOString(),
              },
            })
          }
          title={`Hide from triage for ${SNOOZE_DAYS} days`}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
        >
          <Moon className="h-3 w-3" />
          {snoozed ? "Snoozed · wake up" : "Snooze"}
        </button>
      )}
    </div>
  );
}
