import { Loader2 } from "lucide-react";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmarks,
  useDeleteBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useDebounce } from "@/shared/hooks/useDebounce";

import BookmarkListHeader from "./BookmarkListHeader";
import BookmarkBulkActions from "./BookmarkBulkActions";
import DraggableBookmark from "./DraggableBookmark";

const ROW_HEIGHT = { list: 96, grid: 256 };

export default function BookmarkList({ activeFolder }) {
  const { data: folders = [] } = useFolders();

  const selectedId = useAppStore((s) => s.selectedBookmarkId);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const searchFields = useAppStore((s) => s.searchFields);
  const selectedBookmarks = useAppStore((s) => s.selectedBookmarks);
  const toggleBookmarkSelection = useAppStore((s) => s.toggleBookmarkSelection);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const [selectedTag, setSelectedTag] = useState("");
  useEffect(() => setSelectedTag(""), [activeFolder]);

  useHotkeys("v", () => setViewMode(viewMode === "list" ? "grid" : "list"), [
    viewMode,
  ]);

  const activeFields = useMemo(
    () =>
      Object.entries(searchFields)
        .filter(([, isActive]) => isActive)
        .map(([field]) => field),
    [searchFields]
  );

  const {
    data: bookmarks = [],
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBookmarks({
    folderId: activeFolder,
    q: debouncedQuery,
    fields: activeFields,
    tag: selectedTag,
  });

  const { mutate: updateBookmark } = useUpdateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const [bookmarkToDelete, setBookmarkToDelete] = useState(null);

  // Folder id -> "Parent / Child", built once instead of per row.
  const breadcrumbs = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    return new Map(
      folders.map((f) => {
        const parent = f.parentId && byId.get(f.parentId);
        return [f.id, parent ? `${parent.name} / ${f.name}` : f.name];
      })
    );
  }, [folders]);

  const handleToggleSelect = useCallback(
    (e, id) => {
      e.stopPropagation();
      toggleBookmarkSelection(id);
    },
    [toggleBookmarkSelection]
  );

  const handleToggleFavorite = useCallback(
    (e, b) => {
      e.stopPropagation();
      updateBookmark({ id: b.id, data: { isFavorite: !b.isFavorite } });
    },
    [updateBookmark]
  );

  const handleDeleteClick = useCallback((e, id) => {
    e.stopPropagation();
    setBookmarkToDelete(id);
  }, []);

  const confirmDelete = () => {
    if (!bookmarkToDelete) return;
    deleteBookmark.mutate(bookmarkToDelete, {
      onSuccess: () => {
        if (selectedId === bookmarkToDelete) setSelectedId(null);
      },
      onSettled: () => setBookmarkToDelete(null),
    });
  };

  const firstFolderId = activeFolder.split(",")[0];
  const folderName =
    activeFolder === "root"
      ? "All Bookmarks"
      : activeFolder === "favorites"
        ? "Favorites"
        : folders.find((f) => f.id === firstFolderId)?.name || "Folder";

  const scrollRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT[viewMode],
    overscan: 10,
  });

  // Load the next page when the end of the list scrolls into view.
  const sentinelRef = useRef(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root: scrollRef.current, rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, bookmarks.length]);

  const renderBookmark = (b, virtualItem) => (
    <DraggableBookmark
      key={b.id}
      b={b}
      isActive={selectedId === b.id}
      isSelected={selectedBookmarks.has(b.id)}
      breadcrumb={breadcrumbs.get(b.folderId) ?? null}
      virtualItem={virtualItem}
      viewMode={viewMode}
      onSelect={setSelectedId}
      onToggleSelect={handleToggleSelect}
      onToggleFavorite={handleToggleFavorite}
      onDelete={handleDeleteClick}
    />
  );

  return (
    <div className="relative flex w-1/3 flex-col border-r border-slate-200 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950">
      <BookmarkListHeader
        folderName={folderName}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />

      <div
        ref={scrollRef}
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
        ) : viewMode === "grid" ? (
          <div
            className="grid w-full gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {bookmarks.map((b) => renderBookmark(b, null))}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const b = bookmarks[item.index];
              return b ? renderBookmark(b, item) : null;
            })}
          </div>
        )}

        <div ref={sentinelRef} className="flex h-8 items-center justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      <BookmarkBulkActions />

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
                onClick={() => setBookmarkToDelete(null)}
                className="flex-1 rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none disabled:opacity-50"
                disabled={deleteBookmark.isPending}
              >
                {deleteBookmark.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
