import { useState } from "react";
import { HelpCircle, Menu, Plus, Search, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import ViewMenu from "./ViewMenu";

const SYNTAX = [
  ["tag:rust", "has the tag (nested tags included)"],
  ["-tag:old", "does not have the tag"],
  ["site:github.com", "from a website"],
  ["is:unread", "unread · reading · done · archived"],
  ["is:fav", "also pinned · dead · article"],
  ["saved:7d", "saved in the last 7 days"],
  ["opened:30d", "opened in the last 30 days"],
  ["stale:180d", "not opened for 180 days"],
  ['tag:"two words"', "quote values with spaces"],
];

function SyntaxHelp({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Search syntax"
        title="Search syntax"
        className="rounded-md p-1 text-slate-400 transition-colors hover:text-blue-500"
      >
        <HelpCircle className="h-4 w-4 stroke-[1.5]" />
      </button>
      {open && (
        <div className="animate-pop shadow-lift absolute top-8 right-0 z-30 w-72 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Search syntax
          </p>
          <ul className="space-y-1.5">
            {SYNTAX.map(([example, meaning]) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(example);
                    setOpen(false);
                  }}
                  className="flex w-full items-baseline justify-between gap-3 rounded-md px-1.5 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <code className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {example}
                  </code>
                  <span className="text-[10px] text-slate-500">{meaning}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-slate-400">
            Combine them, then save the search as a smart view.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BookmarkListHeader({
  folderName,
  view,
  folderId,
  selectedTag,
  setSelectedTag,
  sort,
  onSortChange,
}) {
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  return (
    <>
      <div className="z-10 flex items-center justify-between p-4 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open folders"
            className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200/60 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5 stroke-[1.5]" />
          </button>
          <h2 className="truncate text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200">
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

      <div className="z-10 flex flex-col gap-2.5 border-b border-slate-100 px-4 pb-3 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="group relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-slate-400 transition-colors group-focus-within:text-blue-500" />
            <input
              id="bookmark-search"
              type="text"
              placeholder={`Search ${folderName}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-16 pl-9 text-sm shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:focus:ring-blue-500/20"
            />
            <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="rounded-md p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <SyntaxHelp
                onPick={(example) =>
                  setSearchQuery(
                    searchQuery ? `${searchQuery} ${example}` : example
                  )
                }
              />
            </div>
          </div>

          <ViewMenu
            view={view}
            folderId={folderId}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            sort={sort}
            onSortChange={onSortChange}
          />
        </div>

        {/* A hidden filter would be confusing, so the active one stays visible. */}
        {selectedTag && (
          <button
            type="button"
            onClick={() => setSelectedTag("")}
            className="flex items-center gap-1 self-start rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          >
            Tag: {selectedTag} <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}
