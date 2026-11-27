import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, GROUP_OPTIONS } from "@/lib/viewDefs";
import { selectedFolderId } from "@/lib/folderTree";
import { useAppStore } from "@/store/useAppStore";
import { useTags } from "@/domains/bookmarks/application/useBookmarks";
import { useSaveView } from "@/domains/organize/application/useOrganize";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useExportData } from "@/domains/identity/application/useSettings";

const FIELDS = ["title", "description", "notes", "tags", "content"];

const label =
  "mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase";
const field =
  "w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900";
const chip = (on) =>
  cn(
    "rounded-md border px-2 py-1 text-xs capitalize transition-colors",
    on
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
      : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
  );

/** Keeps the current search in the sidebar as a view. */
function SaveSearch({ q, folderId, sort, onSaved }) {
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
      { onSuccess: onSaved }
    );
  };

  return (
    <form onSubmit={submit}>
      <span className={label}>Save this search</span>
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Name it…"
          aria-label="View name"
          className={field}
        />
        <button
          type="submit"
          disabled={save.isPending || !name.trim()}
          aria-label="Save view"
          className="rounded-lg bg-blue-600 px-2 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}

/** Everything about how the list looks, behind one button. */
export default function ViewMenu({
  view,
  folderId,
  selectedTag,
  setSelectedTag,
  sort,
  onSortChange,
}) {
  const [open, setOpen] = useState(false);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const searchFields = useAppStore((s) => s.searchFields);
  const toggleSearchField = useAppStore((s) => s.toggleSearchField);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const groupBy = useAppStore((s) => s.groupBy);
  const setGroupBy = useAppStore((s) => s.setGroupBy);
  const density = useAppStore((s) => s.density);
  const setDensity = useAppStore((s) => s.setDensity);
  const { data: tags = [] } = useTags();
  const { data: folders = [] } = useFolders();
  const exportData = useExportData();
  // "All", favorites and smart views are not folders, so cannot be exported alone.
  const folder = folders.find((f) => f.id === selectedFolderId(folderId));
  const q = [view?.q, searchQuery.trim()].filter(Boolean).join(" ");

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="View options"
        title="View options"
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-slate-200",
          open && "border-blue-300 text-blue-600"
        )}
      >
        <SlidersHorizontal className="h-4 w-4 stroke-[1.5]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="View options"
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            className="animate-pop shadow-lift absolute top-12 right-0 z-30 max-h-[70vh] w-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <label className="block">
              <span className={label}>Sort</span>
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value)}
                className={field}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Group</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className={field}
              >
                {GROUP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Tag</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className={field}
              >
                <option value="">All tags</option>
                {tags.map(({ tag, count }) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className={label}>Layout</span>
              <div className="flex flex-wrap gap-1.5">
                {["list", "grid"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className={chip(viewMode === mode)}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={density === "compact"}
                  onClick={() =>
                    setDensity(
                      density === "compact" ? "comfortable" : "compact"
                    )
                  }
                  className={chip(density === "compact")}
                >
                  Compact rows
                </button>
              </div>
            </div>
            <div>
              <span className={label}>Search in</span>
              <div className="flex flex-wrap gap-1.5">
                {FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={!!searchFields[f]}
                    onClick={() => toggleSearchField(f)}
                    className={chip(searchFields[f])}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {searchQuery.trim() && (
              <SaveSearch
                q={q}
                folderId={folderId}
                sort={sort}
                onSaved={() => setOpen(false)}
              />
            )}
            {folder && (
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className={label}>Export this folder</span>
                <div className="flex gap-1.5">
                  {["csv", "json"].map((format) => (
                    <button
                      key={format}
                      type="button"
                      disabled={exportData.isPending}
                      onClick={() => {
                        exportData.mutate({ format, folder });
                        setOpen(false);
                      }}
                      className={cn(chip(false), "normal-case")}
                    >
                      Export as {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
