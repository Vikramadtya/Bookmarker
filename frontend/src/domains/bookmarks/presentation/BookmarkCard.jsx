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
import { FavoriteButton } from "@/shared/ui/FavoriteButton";
import { displayTitle } from "./bookmarkText";

export default function BookmarkCard({
  b,
  isActive,
  isSelected,
  breadcrumb,
  onToggleSelect,
  onToggleFavorite,
  onDelete,
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col items-start gap-4">
        <button
          onClick={(e) => onToggleSelect(e, b.id)}
          className={cn(
            "z-20 shrink-0 rounded-md transition-all",
            isSelected
              ? "text-blue-500 opacity-100"
              : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-400 dark:text-slate-600"
          )}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        <div className="flex w-full items-center justify-between">
          <Favicon src={b.logoURL} className="h-10 w-10" />
          {breadcrumb && (
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <Folder className="h-3 w-3 shrink-0 stroke-[2] text-slate-400 dark:text-slate-500" />
              <span className="max-w-[80px] truncate text-[9px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {breadcrumb}
              </span>
            </div>
          )}
        </div>

        <div className="w-full min-w-0 flex-1">
          <p
            className={cn(
              "flex items-center gap-1 truncate text-sm font-medium transition-colors",
              isActive
                ? "text-slate-900 dark:text-white"
                : "text-slate-700 dark:text-slate-300"
            )}
          >
            <span className="truncate">{displayTitle(b)}</span>
            {b.isDeadLink && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            )}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-light text-slate-500">
            {b.bookmarkURL}
          </p>
          {b.description && (
            <p className="mt-2 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
              {b.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <a
          href={b.bookmarkURL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-400"
          title="Open Link"
        >
          <ExternalLink className="h-4 w-4 stroke-[1.5]" />
        </a>
        <FavoriteButton
          isFavorite={b.isFavorite}
          onClick={(e) => onToggleFavorite(e, b)}
        />
        <button
          onClick={(e) => onDelete(e, b.id)}
          title="Delete Bookmark"
          className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
}
