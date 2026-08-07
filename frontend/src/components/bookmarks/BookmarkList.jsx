import { Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useHotkeys } from "react-hotkeys-hook";
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

import BookmarkListHeader from "./BookmarkListHeader";
import BookmarkBulkActions from "./BookmarkBulkActions";
import DraggableBookmark from "./DraggableBookmark";

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
    viewMode,
    setViewMode,
  } = useAppStore();

  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [selectedTag, setSelectedTag] = useState("");

  useHotkeys("v", () => setViewMode(viewMode === "list" ? "grid" : "list"), [
    viewMode,
  ]);

  const activeFields = Object.entries(searchFields)
    .filter(([_, isActive]) => isActive)
    .map(([field]) => field);

  const { data: rawBookmarks = [], isLoading } = useBookmarks(
    activeFolder,
    debouncedQuery,
    activeFields
  );

  const bookmarks = useMemo(() => {
    if (!selectedTag) return rawBookmarks;
    return rawBookmarks.filter((b) => b.tags?.includes(selectedTag));
  }, [rawBookmarks, selectedTag]);
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
    estimateSize: () => (viewMode === "list" ? 96 : 256),
    overscan: 10,
  });

  return (
    <div className="relative flex w-1/3 flex-col border-r border-slate-200 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950">
      <BookmarkListHeader
        openBookmarkModal={openBookmarkModal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        folderName={folderName}
        searchFields={searchFields}
        toggleSearchField={toggleSearchField}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        rawBookmarks={rawBookmarks}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

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
            style={
              viewMode === "grid"
                ? {
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "1rem",
                    width: "100%",
                  }
                : {
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }
            }
          >
            <AnimatePresence>
              {(viewMode === "grid"
                ? bookmarks
                : virtualizer.getVirtualItems()
              ).map((item) => {
                const b = viewMode === "grid" ? item : bookmarks[item.index];
                if (!b) return null;
                return (
                  <DraggableBookmark
                    key={b.id}
                    b={b}
                    selectedId={selectedBookmark?.id}
                    onSelect={setSelectedBookmark}
                    virtualItem={viewMode === "list" ? item : null}
                    handleDelete={handleDeleteClick}
                    isSelected={selectedBookmarks.has(b.id)}
                    toggleSelection={toggleSelection}
                    handleToggleFavorite={handleToggleFavorite}
                    folders={folders}
                    viewMode={viewMode}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bulk Operations Toolbar */}
      <BookmarkBulkActions
        selectedBookmarks={selectedBookmarks}
        showMoveMenu={showMoveMenu}
        setShowMoveMenu={setShowMoveMenu}
        bulkMoveBookmarks={bulkMoveBookmarks}
        clearBookmarkSelection={clearBookmarkSelection}
        folders={folders}
        bulkDeleteBookmarks={bulkDeleteBookmarks}
      />

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
