import { create } from "zustand";
import { devtools } from "zustand/middleware";

const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
  }
  return "light";
};

export const useAppStore = create(
  devtools(
    (set) => ({
      // Theme & UI State
      theme: getInitialTheme(),
      isSidebarCompact: false,
      isSettingsModalOpen: false,

      toggleSidebar: () =>
        set(
          (state) => ({ isSidebarCompact: !state.isSidebarCompact }),
          false,
          "toggleSidebar"
        ),
      setSettingsModalOpen: (isOpen) =>
        set({ isSettingsModalOpen: isOpen }, false, "setSettingsModalOpen"),

      toggleTheme: () =>
        set(
          (state) => {
            const newTheme = state.theme === "light" ? "dark" : "light";
            localStorage.setItem("theme", newTheme);
            if (newTheme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
            return { theme: newTheme };
          },
          false,
          "toggleTheme"
        ),

      setTheme: (theme) =>
        set(
          () => {
            localStorage.setItem("theme", theme);
            if (theme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
            return { theme };
          },
          false,
          "setTheme"
        ),

      // Bookmark Central State
      selectedBookmark: null,
      setSelectedBookmark: (bookmark) =>
        set({ selectedBookmark: bookmark }, false, "setSelectedBookmark"),

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

      // Bulk Selection State
      selectedBookmarks: new Set(),
      toggleBookmarkSelection: (id) =>
        set(
          (state) => {
            const next = new Set(state.selectedBookmarks);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { selectedBookmarks: next };
          },
          false,
          "toggleBookmarkSelection"
        ),
      clearBookmarkSelection: () =>
        set({ selectedBookmarks: new Set() }, false, "clearBookmarkSelection"),

      // Search State
      searchQuery: "",
      setSearchQuery: (query) =>
        set({ searchQuery: query }, false, "setSearchQuery"),

      searchFields: {
        title: true,
        description: true,
        notes: true,
        tags: true,
      },
      toggleSearchField: (field) =>
        set(
          (state) => ({
            searchFields: {
              ...state.searchFields,
              [field]: !state.searchFields[field],
            },
          }),
          false,
          "toggleSearchField"
        ),
    }),
    { name: "AppStore" }
  )
);
