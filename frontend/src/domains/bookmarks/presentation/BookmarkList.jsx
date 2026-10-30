import { Loader2, Plus, SearchX } from "lucide-react";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmarks,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { useUndoableDelete } from "@/domains/bookmarks/application/useUndoableDelete";
import { BookmarkListSkeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
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
  const pendingDeletes = useAppStore((s) => s.pendingDeletes);
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openMoveModal = useAppStore((s) => s.openMoveModal);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

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
    data: loadedBookmarks = [],
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

  // Bookmarks inside their undo window are already gone from the UI.
  const bookmarks = useMemo(
    () =>
      pendingDeletes.size
        ? loadedBookmarks.filter((b) => !pendingDeletes.has(b.id))
        : loadedBookmarks,
    [loadedBookmarks, pendingDeletes]
  );

  const { mutate: updateBookmark } = useUpdateBookmark();
  const scheduleDelete = useUndoableDelete();

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

  const handleDeleteClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      scheduleDelete([id]);
    },
    [scheduleDelete]
  );

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

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const selected = bookmarks.find((b) => b.id === selectedId);

  const moveSelection = (delta) => {
    if (bookmarks.length === 0) return;
    const current = bookmarks.findIndex((b) => b.id === selectedId);
    const next = Math.min(
      bookmarks.length - 1,
      Math.max(
        0,
        current === -1
          ? delta > 0
            ? 0
            : bookmarks.length - 1
          : current + delta
      )
    );
    setSelectedId(bookmarks[next].id);
    if (viewMode === "list") {
      virtualizer.scrollToIndex(next, { align: "auto" });
    } else {
      scrollRef.current
        ?.querySelector(`[data-bookmark-id="${bookmarks[next].id}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  };

  useHotkeys("j, down", () => moveSelection(1), { preventDefault: true }, [
    bookmarks,
    selectedId,
    viewMode,
  ]);
  useHotkeys("k, up", () => moveSelection(-1), { preventDefault: true }, [
    bookmarks,
    selectedId,
    viewMode,
  ]);
  useHotkeys("n", () => openBookmarkModal("add"), { preventDefault: true });
  useHotkeys("/", () => document.getElementById("bookmark-search")?.focus(), {
    preventDefault: true,
  });
  useHotkeys("e", () => selected && openBookmarkModal("edit", selected), [
    selected,
  ]);
  useHotkeys("m", () => selected && openMoveModal(selected), [selected]);
  useHotkeys(
    "f",
    () =>
      selected &&
      updateBookmark({
        id: selected.id,
        data: { isFavorite: !selected.isFavorite },
      }),
    [selected]
  );
  useHotkeys("x", () => selected && toggleBookmarkSelection(selected.id), [
    selected,
  ]);
  useHotkeys("d", () => selected && scheduleDelete([selected.id]), [
    selected,
    scheduleDelete,
  ]);
  useHotkeys(
    "o",
    () => selected && window.open(selected.bookmarkURL, "_blank", "noopener"),
    [selected]
  );

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

  const renderBookmark = (b, virtualItem, index) => (
    <DraggableBookmark
      key={b.id}
      b={b}
      isActive={selectedId === b.id}
      isSelected={selectedBookmarks.has(b.id)}
      breadcrumb={breadcrumbs.get(b.folderId) ?? null}
      virtualItem={virtualItem}
      index={index}
      viewMode={viewMode}
      onSelect={setSelectedId}
      onToggleSelect={handleToggleSelect}
      onToggleFavorite={handleToggleFavorite}
      onDelete={handleDeleteClick}
    />
  );

  return (
    <div className="relative flex w-full flex-col border-r border-slate-200 bg-slate-50/60 md:w-1/3 dark:border-slate-800 dark:bg-slate-950">
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
          <BookmarkListSkeleton viewMode={viewMode} />
        ) : bookmarks.length === 0 ? (
          searchQuery || selectedTag ? (
            <EmptyState
              title={
                searchQuery ? "No matching bookmarks" : "Nothing with this tag"
              }
              description="Try different words, or widen the search fields above."
              action={
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag("");
                  }}
                  className="shadow-soft flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <SearchX className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title={
                activeFolder === "favorites"
                  ? "No favorites yet"
                  : "Nothing saved here yet"
              }
              description={
                activeFolder === "favorites"
                  ? "Star a bookmark and it will show up here."
                  : "Save your first link, or drag one in from another folder."
              }
              action={
                <button
                  onClick={() => openBookmarkModal("add")}
                  className="shadow-soft flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add bookmark
                </button>
              }
            />
          )
        ) : viewMode === "grid" ? (
          <div
            className="grid w-full gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {bookmarks.map((b, i) => renderBookmark(b, null, i))}
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
              return b ? renderBookmark(b, item, item.index) : null;
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
    </div>
  );
}
