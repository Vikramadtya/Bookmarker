import {
  CheckSquare,
  Square,
  ExternalLink,
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

export default function BookmarkCard({
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
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Thumbnail
          bookmark={b}
          pending={pending}
          className="aspect-video w-full rounded-lg"
        />
        <button
          onClick={(e) => onToggleSelect(e, b.id)}
          aria-label={isSelected ? "Deselect bookmark" : "Select bookmark"}
          className={cn(
            "shadow-soft absolute top-2 left-2 z-20 rounded-md bg-white/90 p-0.5 backdrop-blur transition-all dark:bg-slate-900/90",
            isSelected
              ? "text-blue-500 opacity-100"
              : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:text-slate-500"
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
        {breadcrumb && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-white backdrop-blur">
            <Folder className="h-3 w-3 shrink-0 stroke-[2]" />
            <span className="max-w-[90px] truncate text-[9px] font-semibold tracking-wider uppercase">
              {breadcrumb}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Favicon
            src={b.logoURL}
            className="h-4 w-4 rounded p-0.5"
            iconClassName="h-3 w-3"
          />
          <span className="truncate">{hostnameOf(b.bookmarkURL)}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="shrink-0">{timeAgo(b.creationDate)}</span>
        </div>

        {pending ? (
          <div className="mt-2.5 space-y-2">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                "mt-1.5 line-clamp-2 text-sm leading-snug font-semibold transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-800 dark:text-slate-200"
              )}
            >
              {displayTitle(b)}
              {b.isDeadLink && (
                <AlertTriangle className="ml-1 inline h-3.5 w-3.5 -translate-y-px text-red-500" />
              )}
            </p>
            {b.description && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {b.description}
              </p>
            )}
          </>
        )}

        {b.tags?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {b.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
            {b.tags.length > 3 && (
              <span className="px-1 py-0.5 text-[10px] text-slate-400">
                +{b.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between opacity-60 transition-opacity group-hover:opacity-100">
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
