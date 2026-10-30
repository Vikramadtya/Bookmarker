import { Menu, Plus, Search, LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useTags } from "@/domains/bookmarks/application/useBookmarks";

export default function BookmarkListHeader({
  folderName,
  selectedTag,
  setSelectedTag,
}) {
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const searchFields = useAppStore((s) => s.searchFields);
  const toggleSearchField = useAppStore((s) => s.toggleSearchField);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const { data: tags = [] } = useTags();

  return (
    <>
      <div className="z-10 flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open folders"
            className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200/60 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5 stroke-[1.5]" />
          </button>
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            {folderName}
          </h2>
        </div>
        <button
          onClick={() => openBookmarkModal("add")}
          className="shadow-soft flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[1.5]" />
          <span>New</span>
        </button>
      </div>

      <div className="z-10 flex flex-col gap-2.5 border-b border-slate-100 px-4 pb-4 dark:border-slate-800/50">
        <div className="group relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input
            id="bookmark-search"
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
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
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
