import {
  CheckSquare,
  Square,
  ExternalLink,
  GripVertical,
  Trash2,
  Folder,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Favicon } from "@/shared/ui/Favicon";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Thumbnail } from "@/shared/ui/Thumbnail";
import { FavoriteButton } from "@/shared/ui/FavoriteButton";
import { displayTitle, hostnameOf, isPending, timeAgo } from "./bookmarkText";

export default function BookmarkListItem({
  b,
  isActive,
  isSelected,
  breadcrumb,
  onToggleSelect,
  onToggleFavorite,
  onDelete,
}) {
  const pending = isPending(b);

  return (
    <div className="flex h-full items-center justify-between gap-3">
      {/* Purely a cue: the whole row is the drag target. */}
      <GripVertical
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-0.5 h-4 w-4 -translate-y-1/2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600"
      />
      <div className="flex h-full w-full items-center gap-3 overflow-hidden">
        <button
          onClick={(e) => onToggleSelect(e, b.id)}
          aria-label={isSelected ? "Deselect bookmark" : "Select bookmark"}
          className={cn(
            "z-20 shrink-0 overflow-hidden rounded-md transition-all duration-200",
            isSelected
              ? "w-5 text-blue-500 opacity-100"
              : "w-0 text-slate-300 opacity-0 group-hover:w-5 group-hover:opacity-100 hover:text-slate-500 dark:text-slate-600"
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        <Favicon src={b.logoURL} className="h-8 w-8" />

        <div className="w-full min-w-0 flex-1">
          {pending ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : (
            <>
              <p
                className={cn(
                  "flex items-center gap-1 truncate text-sm font-medium transition-colors",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-800 dark:text-slate-200"
                )}
              >
                <span className="truncate">{displayTitle(b)}</span>
                {b.isDeadLink && (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                )}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                <span className="truncate">{hostnameOf(b.bookmarkURL)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="shrink-0">{timeAgo(b.creationDate)}</span>
              </p>
            </>
          )}
          {breadcrumb && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <Folder className="h-3 w-3 shrink-0 stroke-[2] text-slate-400 dark:text-slate-500" />
              <span className="truncate text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {breadcrumb}
              </span>
            </div>
          )}
        </div>
      </div>

      {(b.imageURL || pending) && (
        <div className="shrink-0 group-hover:hidden">
          <Thumbnail
            bookmark={b}
            pending={pending}
            className="h-11 w-16 rounded-md"
          />
        </div>
      )}

      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
        <a
          href={b.bookmarkURL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          title="Open link (O)"
        >
          <ExternalLink className="h-4 w-4 stroke-[1.5]" />
        </a>
        <FavoriteButton
          isFavorite={b.isFavorite}
          onClick={(e) => onToggleFavorite(e, b)}
        />
        <button
          onClick={(e) => onDelete(e, b.id)}
          title="Delete (D)"
          aria-label="Delete bookmark"
          className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
}
