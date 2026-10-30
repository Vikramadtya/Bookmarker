import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Server data lives in React Query; this store only holds UI state.
// Always read it with a selector (`useAppStore((s) => s.x)`) so a component
// re-renders only when the slice it uses changes.
export const useAppStore = create(
  devtools(
    (set) => ({
      isSidebarCompact: false,
      isSettingsModalOpen: false,
      viewMode: "list", // 'list' | 'grid'
      setViewMode: (mode) => set({ viewMode: mode }, false, "setViewMode"),
      toggleSidebar: () =>
        set(
          (s) => ({ isSidebarCompact: !s.isSidebarCompact }),
          false,
          "toggleSidebar"
        ),
      setSettingsModalOpen: (isOpen) =>
        set({ isSettingsModalOpen: isOpen }, false, "setSettingsModalOpen"),

      // The open bookmark is stored by id; its data comes from the query cache.
      selectedBookmarkId: null,
      setSelectedBookmarkId: (id) =>
        set({ selectedBookmarkId: id }, false, "setSelectedBookmarkId"),

      bookmarkFormModal: { isOpen: false, type: null, data: null },
      openBookmarkModal: (type, data = null) =>
        set(
          { bookmarkFormModal: { isOpen: true, type, data } },
          false,
          "openBookmarkModal"
        ),
      closeBookmarkModal: () =>
        set(
          { bookmarkFormModal: { isOpen: false, type: null, data: null } },
          false,
          "closeBookmarkModal"
        ),

      moveBookmarkModal: { isOpen: false, bookmark: null },
      openMoveModal: (bookmark) =>
        set(
          { moveBookmarkModal: { isOpen: true, bookmark } },
          false,
          "openMoveModal"
        ),
      closeMoveModal: () =>
        set(
          { moveBookmarkModal: { isOpen: false, bookmark: null } },
          false,
          "closeMoveModal"
        ),

      selectedBookmarks: new Set(),
      toggleBookmarkSelection: (id) =>
        set(
          (s) => {
            const next = new Set(s.selectedBookmarks);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { selectedBookmarks: next };
          },
          false,
          "toggleBookmarkSelection"
        ),
      clearBookmarkSelection: () =>
        set({ selectedBookmarks: new Set() }, false, "clearBookmarkSelection"),

      // Bookmarks deleted but still inside their undo window; lists hide them.
      pendingDeletes: new Set(),
      setPendingDeletes: (ids) =>
        set({ pendingDeletes: ids }, false, "setPendingDeletes"),

      isMobileNavOpen: false,
      setMobileNavOpen: (isOpen) =>
        set({ isMobileNavOpen: isOpen }, false, "setMobileNavOpen"),

      isShortcutsOpen: false,
      setShortcutsOpen: (isOpen) =>
        set({ isShortcutsOpen: isOpen }, false, "setShortcutsOpen"),

      searchQuery: "",
      setSearchQuery: (query) =>
        set({ searchQuery: query }, false, "setSearchQuery"),
      // Article content is not searched by default: it is large and slows every query.
      searchFields: { title: true, description: true, notes: true, tags: true },
      toggleSearchField: (field) =>
        set(
          (s) => ({
            searchFields: {
              ...s.searchFields,
              [field]: !s.searchFields[field],
            },
          }),
          false,
          "toggleSearchField"
        ),
    }),
    { name: "AppStore", enabled: import.meta.env.DEV }
  )
);
