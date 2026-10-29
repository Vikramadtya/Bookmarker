import React from "react";
import {
  Globe,
  CheckSquare,
  Square,
  ExternalLink,
  Trash2,
  Folder,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookmarkCard({
  b,
  selectedId,
  isSelected,
  toggleSelection,
  handleToggleFavorite,
  handleDelete,
  breadcrumb,
  imageError,
  setImageError,
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col items-start gap-4">
        <button
          onClick={(e) => toggleSelection(e, b.id)}
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
          {b.logoURL && !imageError ? (
            <img
              src={b.logoURL}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-800"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <Globe className="h-4 w-4 stroke-[1.5] text-slate-300 dark:text-slate-600" />
            </div>
          )}

          <div className="flex items-center gap-1">
            {breadcrumb && (
              <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                <Folder className="h-3 w-3 shrink-0 stroke-[2] text-slate-400 dark:text-slate-500" />
                <span className="max-w-[80px] truncate text-[9px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {breadcrumb}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <p
            className={cn(
              "flex items-center gap-1 truncate text-sm font-medium transition-colors",
              selectedId === b.id
                ? "text-slate-900 dark:text-white"
                : "text-slate-700 dark:text-slate-300"
            )}
          >
            <span className="truncate">{b.title || "Untitled"}</span>
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
        <button
          onClick={(e) => handleToggleFavorite(e, b)}
          className={cn(
            "rounded-md p-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800",
            b.isFavorite
              ? "text-amber-500 opacity-100"
              : "text-slate-400 hover:text-amber-500"
          )}
          title={b.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={b.isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button
          onClick={(e) => handleDelete(e, b.id)}
          className="rounded-md p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
}
