import {
  Plus,
  Trash2,
  Globe,
  Search,
  CheckSquare,
  Square,
  FolderOutput,
  Loader2,
  ExternalLink,
  Folder,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmarks,
  useDeleteBookmark,
  useUpdateBookmark,
  useBulkDeleteBookmarks,
  useBulkMoveBookmarks,
} from "@/hooks/useBookmarks";
import { useFolders } from "@/hooks/useFolders";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDraggable } from "@dnd-kit/core";

export default function BookmarkList({ activeFolder }) {
  const { data: folders = [] } = useFolders();

  // Connect to Zustand central state
  const {
    selectedBookmark,
    setSelectedBookmark,
    openBookmarkModal,
    searchQuery,
    setSearchQuery,
    searchFields,
    toggleSearchField,
    selectedBookmarks,
    toggleBookmarkSelection,
    clearBookmarkSelection,
  } = useAppStore();

  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeFields = Object.entries(searchFields)
    .filter(([_, isActive]) => isActive)
    .map(([field]) => field);

  const { data: bookmarks = [], isLoading } = useBookmarks(
    activeFolder,
    debouncedQuery,
    activeFields
  );
  const deleteBookmark = useDeleteBookmark();
  const updateBookmark = useUpdateBookmark();
  const bulkDeleteBookmarks = useBulkDeleteBookmarks();
  const bulkMoveBookmarks = useBulkMoveBookmarks();
  const parentRef = useRef(null);

  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    toggleBookmarkSelection(id);
  };

  const handleToggleFavorite = (e, b) => {
    e.stopPropagation();
    updateBookmark.mutate({
      id: b.id,
      data: { isFavorite: !b.isFavorite },
    });
  };

  // Deletion State
  const [bookmarkToDelete, setBookmarkToDelete] = useState(null);

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setBookmarkToDelete(bookmarks.find((b) => b.id === id) || { id });
  };

  const confirmDelete = () => {
    if (!bookmarkToDelete) return;
    deleteBookmark.mutate(bookmarkToDelete.id, {
      onSuccess: () => setBookmarkToDelete(null),
      onError: () => setBookmarkToDelete(null),
    });
  };

  const parsedActiveFolder = activeFolder ? activeFolder.split(",")[0] : "root";
  const folderName =
    activeFolder === "root"
      ? "All Bookmarks"
      : folders.find((f) => f.id === parsedActiveFolder)?.name || "Folder";

  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 10,
  });

  return (
    <div className="relative flex w-1/3 flex-col border-r border-slate-200 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950">
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          >
            <option value="">ALL TAGS</option>
            {Array.from(new Set(bookmarks.flatMap((b) => b.tags || []))).map(
              (tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        ref={parentRef}
        className="no-scrollbar flex-1 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-sm">
              {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            <AnimatePresence>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const b = bookmarks[virtualItem.index];
                return (
                  <DraggableBookmark
                    key={b.id}
                    b={b}
                    selectedId={selectedBookmark?.id}
                    onSelect={setSelectedBookmark}
                    virtualItem={virtualItem}
                    handleDelete={handleDeleteClick}
                    isSelected={selectedBookmarks.has(b.id)}
                    toggleSelection={toggleSelection}
                    handleToggleFavorite={handleToggleFavorite}
                    folders={folders}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bulk Operations Toolbar */}
      <AnimatePresence>
        {selectedBookmarks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 text-white shadow-xl dark:bg-slate-800"
          >
            <div className="flex items-center gap-2 border-r border-slate-700 px-3 py-1 text-sm font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold">
                {selectedBookmarks.size}
              </span>
              Selected
            </div>

            <div className="relative flex items-center gap-1 px-1">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-800 dark:hover:bg-slate-700"
              >
                <FolderOutput className="h-4 w-4" />
                Move
              </button>

              <AnimatePresence>
                {showMoveMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-48 origin-bottom-left rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="no-scrollbar max-h-60 overflow-y-auto">
                      {folders
                        .filter((f) => !f.parentId && f.name !== "Inbox")
                        .map((collection) => (
                          <div key={collection.id}>
                            <div className="px-2 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              {collection.name}
                            </div>
                            {folders
                              .filter((f) => f.parentId === collection.id)
                              .map((folder) => (
                                <button
                                  key={folder.id}
                                  onClick={() => {
                                    bulkMoveBookmarks.mutate(
                                      {
                                        ids: Array.from(selectedBookmarks),
                                        folderId: folder.id,
                                      },
                                      {
                                        onSuccess: () => {
                                          clearBookmarkSelection();
                                          setShowMoveMenu(false);
                                        },
                                      }
                                    );
                                  }}
                                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  {folder.name}
                                </button>
                              ))}
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => {
                  bulkDeleteBookmarks.mutate(Array.from(selectedBookmarks), {
                    onSuccess: () => clearBookmarkSelection(),
                  });
                }}
                disabled={bulkDeleteBookmarks.isPending}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-slate-800 disabled:opacity-50 dark:hover:bg-slate-700"
              >
                {bulkDeleteBookmarks.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
            <button
              onClick={() => clearBookmarkSelection()}
              className="ml-1 rounded-full p-1.5 transition-colors hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {bookmarkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Delete Bookmark
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this bookmark? This action cannot
              be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBookmarkToDelete(null);
                }}
                className="flex-1 rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none disabled:opacity-50"
                disabled={deleteBookmark.isPending}
              >
                {deleteBookmark.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraggableBookmark({
  b,
  selectedId,
  onSelect,
  virtualItem,
  handleDelete,
  isSelected,
  toggleSelection,
  handleToggleFavorite,
  folders,
}) {
  const [imageError, setImageError] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: b.id,
      data: { type: "bookmark" },
    });

  const getFolderBreadcrumb = () => {
    if (!b.folderId || !folders || b.folderId === "root") return null;
    const folder = folders.find((f) => f.id === b.folderId);
    if (!folder) return null;
    if (folder.parentId) {
      const parent = folders.find((f) => f.id === folder.parentId);
      return parent ? `${parent.name} / ${folder.name}` : folder.name;
    }
    return folder.name;
  };

  const breadcrumb = getFolderBreadcrumb();

  const style = {
    position: "absolute",
    top: `${virtualItem.start}px`,
    left: 0,
    width: "100%",
    height: `${virtualItem.size - 8}px`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect(b)}
      style={style}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl p-3 transition-all duration-200",
        selectedId === b.id
          ? "border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:border-slate-800 dark:bg-slate-900"
          : isSelected
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-900/10"
            : "border border-transparent bg-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900"
      )}
    >
      <div className="relative z-10 flex h-full items-center justify-between gap-3">
        <div className="flex h-full w-full items-center gap-3 overflow-hidden">
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

          {b.logoURL && !imageError ? (
            <img
              src={b.logoURL}
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-800"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <Globe className="h-4 w-4 stroke-[1.5] text-slate-300 dark:text-slate-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-medium transition-colors",
                selectedId === b.id
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-700 dark:text-slate-300"
              )}
            >
              {b.title || "Untitled"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-light text-slate-500">
              {b.bookmarkURL}
            </p>
            {breadcrumb && (
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                <Folder className="h-3 w-3 shrink-0 stroke-[2] text-slate-400 dark:text-slate-500" />
                <span className="truncate text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {breadcrumb}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
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
    </motion.div>
  );
}
