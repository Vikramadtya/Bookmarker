import { flattenFolders, selectedFolderId } from "@/lib/folderTree";
import { Loader2, Plus, SearchX } from "lucide-react";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useVirtualizer } from "@tanstack/react-virtual";
import dayjs from "dayjs";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmarks,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { useUndoableDelete } from "@/domains/bookmarks/application/useUndoableDelete";
import {
  useCounts,
  useRecordOpen,
} from "@/domains/organize/application/useOrganize";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { BookmarkListSkeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import Onboarding from "@/domains/organize/presentation/Onboarding";

import BookmarkListHeader from "./BookmarkListHeader";
import BookmarkBulkActions from "./BookmarkBulkActions";
import DraggableBookmark from "./DraggableBookmark";

const ROW_HEIGHT = {
  comfortable: { list: 96, grid: 256 },
  compact: { list: 60, grid: 256 },
};
const HEADER_HEIGHT = 36;
const DATE_SORTS = ["newest", "oldest", "opened"];

const dayLabel = (date) => {
  const d = dayjs(date);
  if (d.isSame(dayjs(), "day")) return "Today";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  if (d.isSame(dayjs(), "year")) return d.format("dddd, MMM D");
  return d.format("MMM D, YYYY");
};

/** Group label for a bookmark, or null when grouping is off for this sort. */
function groupLabeler(groupBy, sort) {
  if (groupBy === "site" && sort === "site")
    return (b) => b.domain || "Unknown site";
  if (groupBy === "day" && DATE_SORTS.includes(sort))
    return (b) => dayLabel(sort === "opened" ? b.lastOpenedAt : b.creationDate);
  return null;
}

/** Items interleaved with section headers, in display order. */
function buildRows({ pinned, items, label }) {
  const rows = [];
  if (pinned.length > 0) {
    rows.push({ type: "header", key: "h-pinned", label: "Pinned" });
    pinned.forEach((b) => rows.push({ type: "item", key: b.id, b }));
    if (items.length > 0 && !label)
      rows.push({ type: "header", key: "h-rest", label: "Everything else" });
  }
  let current = null;
  for (const b of items) {
    const group = label?.(b);
    if (group != null && group !== current) {
      current = group;
      rows.push({ type: "header", key: `h-${group}-${b.id}`, label: group });
    }
    rows.push({ type: "item", key: b.id, b });
  }
  return rows;
}

function GroupHeader({ label }) {
  return (
    <div className="flex h-full items-end px-1 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
      {label}
    </div>
  );
}

export default function BookmarkList({ activeFolder, view }) {
  const { data: folders = [] } = useFolders();
  const { data: counts } = useCounts();

  const selectedId = useAppStore((s) => s.selectedBookmarkId);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const searchFields = useAppStore((s) => s.searchFields);
  const selectedBookmarks = useAppStore((s) => s.selectedBookmarks);
  const toggleBookmarkSelection = useAppStore((s) => s.toggleBookmarkSelection);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const storedSort = useAppStore((s) => s.sort);
  const setSort = useAppStore((s) => s.setSort);
  const groupBy = useAppStore((s) => s.groupBy);
  const density = useAppStore((s) => s.density);
  const pendingDeletes = useAppStore((s) => s.pendingDeletes);
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openMoveModal = useAppStore((s) => s.openMoveModal);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const [selectedTag, setSelectedTag] = useState("");
  const [pickedSort, setPickedSort] = useState(false);
  useEffect(() => {
    setSelectedTag("");
    setPickedSort(false);
  }, [activeFolder, view?.id]);

  // A smart view brings its own order until the user picks one.
  const sort = view?.sort && !pickedSort ? view.sort : storedSort;
  const onSortChange = (value) => {
    setPickedSort(true);
    setSort(value);
  };

  useHotkeys("v", () => setViewMode(viewMode === "list" ? "grid" : "list"), [
    viewMode,
  ]);

  const activeFields = useMemo(
    () =>
      Object.entries(searchFields)
        .filter(([, isActive]) => isActive)
        // Notes also cover highlights, and description covers the summary.
        .flatMap(([field]) =>
          field === "notes"
            ? ["notes", "highlights"]
            : field === "description"
              ? ["description", "summary"]
              : [field]
        ),
    [searchFields]
  );

  const folderId = view ? (view.folderId ?? "root") : activeFolder;
  const q = [view?.q, debouncedQuery].filter(Boolean).join(" ");

  // Pinned bookmarks sit above the list while browsing, not while searching.
  const showPinned = !q && !selectedTag && !view;
  const listParams = {
    folderId,
    q,
    fields: activeFields,
    tag: selectedTag,
    sort,
  };
  const pinnedQuery = useBookmarks({
    ...listParams,
    sort: "manual",
    pinned: true,
    enabled: showPinned,
  });
  const {
    data: loadedBookmarks = [],
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBookmarks({ ...listParams, pinned: showPinned ? false : undefined });

  const visible = useCallback(
    (list) =>
      pendingDeletes.size
        ? list.filter((b) => !pendingDeletes.has(b.id))
        : list,
    [pendingDeletes]
  );
  const pinned = useMemo(
    () => (showPinned ? visible(pinnedQuery.data ?? []) : []),
    [showPinned, pinnedQuery.data, visible]
  );
  const items = useMemo(
    () => visible(loadedBookmarks),
    [loadedBookmarks, visible]
  );
  const bookmarks = useMemo(() => [...pinned, ...items], [pinned, items]);

  const label = groupLabeler(groupBy, sort);
  const rows = useMemo(
    () => buildRows({ pinned, items, label }),
    // label is derived from groupBy and sort
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinned, items, groupBy, sort]
  );

  const { mutate: updateBookmark } = useUpdateBookmark();
  const recordOpen = useRecordOpen();
  const scheduleDelete = useUndoableDelete();

  const openLink = useCallback(
    (b) => {
      window.open(b.bookmarkURL, "_blank", "noopener");
      recordOpen.mutate(b.id);
    },
    [recordOpen]
  );

  // Folder id -> "Study / Java", built once instead of per row.
  const breadcrumbs = useMemo(
    () => new Map(flattenFolders(folders).map((f) => [f.id, f.path])),
    [folders]
  );

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

  const handleOpen = useCallback(
    (e, b) => {
      e.stopPropagation();
      recordOpen.mutate(b.id);
    },
    [recordOpen]
  );

  const firstFolderId = activeFolder.split(",")[0];
  const title = view
    ? view.name
    : activeFolder === "root"
      ? "All Bookmarks"
      : activeFolder === "favorites"
        ? "Favorites"
        : folders.find((f) => f.id === firstFolderId)?.name || "Folder";

  const compact = density === "compact";
  const scrollRef = useRef(null);
  const sizeOf = (row) =>
    row.type === "header"
      ? HEADER_HEIGHT
      : ROW_HEIGHT[density][viewMode === "grid" ? "grid" : "list"];
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => sizeOf(rows[i]),
    overscan: 10,
  });
  // Row heights change with density and grouping.
  useEffect(() => virtualizer.measure(), [virtualizer, density, rows.length]);

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
    const id = bookmarks[next].id;
    setSelectedId(id);
    if (viewMode === "list") {
      virtualizer.scrollToIndex(
        rows.findIndex((r) => r.key === id),
        { align: "auto" }
      );
    } else {
      scrollRef.current
        ?.querySelector(`[data-bookmark-id="${id}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  };

  const nav = [bookmarks, selectedId, viewMode, rows];
  useHotkeys("j, down", () => moveSelection(1), { preventDefault: true }, nav);
  useHotkeys("k, up", () => moveSelection(-1), { preventDefault: true }, nav);
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
  useHotkeys(
    "p",
    () =>
      selected &&
      updateBookmark({ id: selected.id, data: { pinned: !selected.pinned } }),
    [selected]
  );
  useHotkeys(
    "a",
    () =>
      selected &&
      updateBookmark({
        id: selected.id,
        data: {
          status: selected.status === "archived" ? "unread" : "archived",
        },
      }),
    [selected]
  );
  useHotkeys(
    "r",
    () =>
      selected && updateBookmark({ id: selected.id, data: { status: "done" } }),
    [selected]
  );
  useHotkeys("x", () => selected && toggleBookmarkSelection(selected.id), [
    selected,
  ]);
  useHotkeys("d", () => selected && scheduleDelete([selected.id]), [
    selected,
    scheduleDelete,
  ]);
  useHotkeys("o", () => selected && openLink(selected), [selected, openLink]);

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

  const canReorder = sort === "manual" && !q && viewMode === "list";

  const renderBookmark = (b, virtualItem, index) => (
    <DraggableBookmark
      key={b.id}
      b={b}
      isActive={selectedId === b.id}
      isSelected={selectedBookmarks.has(b.id)}
      // Inside a folder, repeating its name on every row is noise.
      breadcrumb={
        b.folderId === selectedFolderId(folderId)
          ? null
          : (breadcrumbs.get(b.folderId) ?? null)
      }
      virtualItem={virtualItem}
      index={index}
      viewMode={viewMode}
      compact={compact}
      canReorder={canReorder}
      onSelect={setSelectedId}
      onToggleSelect={handleToggleSelect}
      onToggleFavorite={handleToggleFavorite}
      onOpen={handleOpen}
      onDelete={handleDeleteClick}
      onArchive={() =>
        updateBookmark({ id: b.id, data: { status: "archived" } })
      }
      onDone={() => updateBookmark({ id: b.id, data: { status: "done" } })}
    />
  );

  const searching = Boolean(searchQuery || selectedTag);
  const libraryEmpty =
    !isLoading &&
    counts?.total === 0 &&
    !searching &&
    !view &&
    activeFolder === "root";

  return (
    <div className="relative flex w-full flex-col border-r border-slate-200 bg-slate-50/60 md:w-1/3 dark:border-slate-800 dark:bg-slate-950">
      <BookmarkListHeader
        folderName={title}
        view={view}
        folderId={folderId}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        sort={sort}
        onSortChange={onSortChange}
      />

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <BookmarkListSkeleton viewMode={viewMode} />
        ) : libraryEmpty ? (
          <Onboarding />
        ) : bookmarks.length === 0 ? (
          searching ? (
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
          ) : view ? (
            <EmptyState
              title={`Nothing in ${view.name}`}
              description="Bookmarks that match this view show up here automatically."
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
            {rows.map((row, i) =>
              row.type === "header" ? (
                <div key={row.key} className="col-span-full h-9">
                  <GroupHeader label={row.label} />
                </div>
              ) : (
                renderBookmark(row.b, null, i)
              )
            )}
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
              const row = rows[item.index];
              if (!row) return null;
              if (row.type === "header")
                return (
                  <div
                    key={row.key}
                    style={{
                      position: "absolute",
                      top: item.start,
                      height: item.size,
                      width: "100%",
                    }}
                  >
                    <GroupHeader label={row.label} />
                  </div>
                );
              return renderBookmark(row.b, item, item.index);
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
