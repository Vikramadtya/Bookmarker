import { useEffect, useState, useMemo } from "react";
import { Command } from "cmdk";
import { Search, Folder, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFolders } from "@/hooks/useFolders";
import { useBookmarks } from "@/hooks/useBookmarks";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Advanced Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFolder, setSearchFolder] = useState("all");
  const [searchFields, setSearchFields] = useState({
    title: true,
    description: true,
    notes: true,
    tags: true,
  });

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: folders = [] } = useFolders();
  const { data: bookmarks = [] } = useBookmarks("root");

  const setActiveFolder = (id) => {
    setSearchParams((prev) => {
      prev.set("folder", id);
      return prev;
    });
    setOpen(false);
  };

  if (!open) return null;

  const query = searchQuery.toLowerCase().trim();

  const filteredFolders = useMemo(() => {
    return folders.filter((folder) => {
      if (searchFolder !== "all") return false;
      if (!query) return true;
      return folder.name.toLowerCase().includes(query);
    });
  }, [folders, searchFolder, query]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      if (searchFolder !== "all" && bookmark.folderId !== searchFolder)
        return false;
      if (!query) return true;

      if (searchFields.title && bookmark.title?.toLowerCase().includes(query))
        return true;
      if (
        searchFields.title &&
        bookmark.bookmarkURL?.toLowerCase().includes(query)
      )
        return true;
      if (
        searchFields.description &&
        bookmark.description?.toLowerCase().includes(query)
      )
        return true;
      if (
        searchFields.tags &&
        bookmark.tags?.some((t) => t.toLowerCase().includes(query))
      )
        return true;
      if (
        searchFields.notes &&
        bookmark.comments?.some((c) => c.toLowerCase().includes(query))
      )
        return true;

      return false;
    });
  }, [bookmarks, searchFolder, query, searchFields]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh] sm:px-0">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] dark:bg-slate-950/60"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <Command
          shouldFilter={false}
          className="flex w-full flex-col bg-transparent text-slate-800 dark:text-slate-100"
          label="Command Menu"
        >
          <div className="flex items-center border-b border-slate-100 px-4 dark:border-slate-800/60">
            <Search className="mr-3 h-5 w-5 stroke-[1.5] text-slate-400" />
            <Command.Input
              className="flex h-14 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              placeholder="Search folders or bookmarks..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              autoFocus
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800/60 dark:bg-slate-950/50">
            <select
              value={searchFolder}
              onChange={(e) => setSearchFolder(e.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition-all outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <div className="mx-1 hidden h-4 w-[1px] bg-slate-200 sm:block dark:bg-slate-700" />

            <span className="hidden text-xs font-medium text-slate-500 sm:block">
              Search in:
            </span>
            {["title", "description", "notes", "tags"].map((field) => (
              <button
                key={field}
                type="button"
                onClick={() =>
                  setSearchFields((prev) => ({
                    ...prev,
                    [field]: !prev[field],
                  }))
                }
                className={cn(
                  "cursor-pointer rounded-md border px-2.5 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-all select-none",
                  searchFields[field]
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-800/80"
                )}
              >
                {field}
              </button>
            ))}
          </div>

          <Command.List className="no-scrollbar max-h-[300px] overflow-x-hidden overflow-y-auto p-2">
            {filteredFolders.length === 0 && filteredBookmarks.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-500">
                No results found.
              </div>
            )}

            {filteredFolders.length > 0 && (
              <Command.Group
                heading="Folders"
                className="px-2 py-2 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {filteredFolders.map((folder) => (
                  <Command.Item
                    key={folder.id}
                    value={folder.id}
                    onSelect={() => setActiveFolder(folder.id)}
                    className="flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm transition-colors data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 dark:data-[selected=true]:bg-blue-900/20 dark:data-[selected=true]:text-blue-300"
                  >
                    <Folder className="mr-3 h-4 w-4 stroke-[1.5]" />
                    {folder.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {filteredBookmarks.length > 0 && (
              <Command.Group
                heading="Bookmarks"
                className="px-2 py-2 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {filteredBookmarks.map((bookmark) => (
                  <CommandPaletteBookmarkItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onSelect={() => {
                      window.open(bookmark.bookmarkURL, "_blank");
                      setOpen(false);
                    }}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/50">
          <span>
            Press{" "}
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans shadow-sm dark:border-slate-700 dark:bg-slate-800">
              Esc
            </kbd>{" "}
            to close
          </span>
          <span className="flex items-center gap-2">
            Navigate with{" "}
            <span className="flex gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 font-sans shadow-sm dark:border-slate-700 dark:bg-slate-800">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 font-sans shadow-sm dark:border-slate-700 dark:bg-slate-800">
                ↓
              </kbd>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function CommandPaletteBookmarkItem({ bookmark, onSelect }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Command.Item
      value={bookmark.id}
      onSelect={onSelect}
      className="flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm transition-colors data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"
    >
      {bookmark.logoURL && !imageError ? (
        <img
          src={bookmark.logoURL}
          alt=""
          className="mr-3 h-5 w-5 shrink-0 rounded-md border border-slate-100 bg-white object-contain p-0.5 dark:border-slate-700 dark:bg-slate-800"
          onError={() => setImageError(true)}
        />
      ) : (
        <Bookmark className="mr-3 h-4 w-4 shrink-0 stroke-[1.5] text-slate-400" />
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate leading-tight font-medium text-slate-700 dark:text-slate-200">
          {bookmark.title || bookmark.bookmarkURL}
        </span>
        {bookmark.title && (
          <span className="mt-0.5 truncate text-xs text-slate-500">
            {bookmark.bookmarkURL}
          </span>
        )}
      </div>
    </Command.Item>
  );
}
