import React from "react";
import { Plus, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookmarkListHeader({
  openBookmarkModal,
  searchQuery,
  setSearchQuery,
  folderName,
  searchFields,
  toggleSearchField,
  selectedTag,
  setSelectedTag,
  rawBookmarks,
  viewMode,
  setViewMode,
}) {
  return (
    <>
      <div className="z-10 flex items-center justify-between p-4 pb-2">
        <h2 className="text-lg font-semibold tracking-wide text-slate-800 dark:text-slate-200">
          Bookmarks
        </h2>
        <button
          onClick={() => openBookmarkModal("add")}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 stroke-[1.5]" />
          <span>New</span>
        </button>
      </div>

      <div className="z-10 flex flex-col gap-2.5 border-b border-slate-100 px-4 pb-4 dark:border-slate-800/50">
        <div className="group relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder={`Search in ${folderName}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-9 text-sm shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {["title", "description", "notes", "tags"].map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => toggleSearchField(field)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[9px] font-semibold tracking-wider uppercase transition-all select-none",
                  searchFields[field]
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-800/80"
                )}
              >
                {field}
              </button>
            ))}
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          >
            <option value="">ALL TAGS</option>
            {Array.from(new Set(rawBookmarks.flatMap((b) => b.tags || []))).map(
              (tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              )
            )}
          </select>

          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Toggle View Mode (Press V)"
          >
            {viewMode === "list" ? (
              <LayoutGrid className="h-3 w-3 stroke-[2]" />
            ) : (
              <ListIcon className="h-3 w-3 stroke-[2]" />
            )}
            <span className="hidden sm:inline">VIEW (V)</span>
          </button>
        </div>
      </div>
    </>
  );
}
