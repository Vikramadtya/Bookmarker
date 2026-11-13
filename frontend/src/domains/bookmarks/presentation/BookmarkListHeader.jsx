import { useState } from "react";
import {
  Check,
  HelpCircle,
  LayoutGrid,
  List as ListIcon,
  Menu,
  Plus,
  Rows3,
  Search,
  Sparkles,
  StretchHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/lib/viewDefs";
import { useAppStore } from "@/store/useAppStore";
import { useTags } from "@/domains/bookmarks/application/useBookmarks";
import { useSaveView } from "@/domains/organize/application/useOrganize";

const FIELDS = ["title", "description", "notes", "tags", "content"];

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

const pill =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase outline-none transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800";

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

function SaveViewButton({ q, folderId, sort }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const save = useSaveView();

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      {
        name: name.trim(),
        q,
        sort,
        ...(folderId &&
          !["root", "favorites"].includes(folderId) && { folderId }),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
        },
      }
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(pill, "flex items-center gap-1")}
        title="Keep this search in the sidebar"
      >
        <Sparkles className="h-3 w-3" />
        Save
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="animate-pop shadow-lift absolute top-8 right-0 z-30 flex w-60 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Name this view…"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={save.isPending}
            aria-label="Save view"
            className="rounded-md bg-blue-600 px-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </form>
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
  const searchFields = useAppStore((s) => s.searchFields);
  const toggleSearchField = useAppStore((s) => s.toggleSearchField);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const groupBy = useAppStore((s) => s.groupBy);
  const setGroupBy = useAppStore((s) => s.setGroupBy);
  const density = useAppStore((s) => s.density);
  const setDensity = useAppStore((s) => s.setDensity);
  const { data: tags = [] } = useTags();

  const q = [view?.q, searchQuery.trim()].filter(Boolean).join(" ");

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
        <div className="group relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input
            id="bookmark-search"
            type="text"
            placeholder={`Search ${folderName}… try tag:rust is:unread`}
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

        <div className="flex flex-wrap items-center gap-1.5">
          {FIELDS.map((field) => (
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

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort"
            className={pill}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            aria-label="Group by"
            className={pill}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            aria-label="Filter by tag"
            className={cn(pill, "max-w-[110px]")}
          >
            <option value="">All tags</option>
            {tags.map(({ tag, count }) => (
              <option key={tag} value={tag}>
                {tag} ({count})
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            {searchQuery.trim() && (
              <SaveViewButton q={q} folderId={folderId} sort={sort} />
            )}
            <button
              onClick={() =>
                setDensity(density === "compact" ? "comfortable" : "compact")
              }
              className={pill}
              title="Toggle compact rows"
              aria-pressed={density === "compact"}
            >
              {density === "compact" ? (
                <StretchHorizontal className="h-3 w-3 stroke-[2]" />
              ) : (
                <Rows3 className="h-3 w-3 stroke-[2]" />
              )}
            </button>
            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className={cn(pill, "flex items-center gap-1")}
              title="Toggle list or grid (V)"
            >
              {viewMode === "list" ? (
                <LayoutGrid className="h-3 w-3 stroke-[2]" />
              ) : (
                <ListIcon className="h-3 w-3 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
