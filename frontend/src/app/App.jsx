import { lazy, Suspense, useCallback, useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import FolderSidebar from "@/domains/folders/presentation/FolderSideBar";
import BookmarksView from "@/domains/bookmarks/presentation/BookmarksView";
import ShortcutsDialog from "@/domains/bookmarks/presentation/ShortcutsDialog";
import {
  useBulkMoveBookmarks,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { positionForDrop } from "@/domains/bookmarks/application/bookmarkCache";
import { useQueryClient } from "@tanstack/react-query";
import { BookmarkSplash } from "@/shared/ui/BookmarkLoader";
import { useAuth } from "@/domains/identity/application/useAuth";
import { useAppStore } from "@/store/useAppStore";

// Rarely-needed screens are fetched on first use instead of in the main bundle.
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const PublicCollectionView = lazy(() => import("@/pages/PublicCollectionView"));
const SavePage = lazy(() => import("@/pages/SavePage"));
const ConnectPage = lazy(() => import("@/pages/ConnectPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const SettingsModal = lazy(
  () => import("@/domains/identity/presentation/SettingsModal")
);
const CommandPalette = lazy(() =>
  import("@/domains/bookmarks/presentation/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  }))
);

const Spinner = BookmarkSplash;

function Workspace() {
  const { mutate: updateBookmark } = useUpdateBookmark();
  const bulkMove = useBulkMoveBookmarks();
  const queryClient = useQueryClient();
  const isSettingsOpen = useAppStore((s) => s.isSettingsModalOpen);
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setPaletteOpen((open) => !open);
    },
    { enableOnFormTags: true }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (active.data.current?.type !== "bookmark" || !over) return;

    // Dropping a bookmark onto a folder moves it, and the whole selection with it
    // when the dragged bookmark is part of one.
    if (over.data.current?.type === "folder") {
      const { selectedBookmarks, clearBookmarkSelection } =
        useAppStore.getState();
      if (selectedBookmarks.has(active.id) && selectedBookmarks.size > 1) {
        bulkMove.mutate(
          { ids: [...selectedBookmarks], folderId: over.id },
          { onSuccess: clearBookmarkSelection }
        );
        return;
      }
      updateBookmark(
        { id: active.id, data: { folderId: over.id } },
        { onSuccess: () => toast.success("Moved bookmark") }
      );
      return;
    }

    // Dropping onto another bookmark reorders, when the list is in manual order.
    if (over.data.current?.type === "bookmark" && over.id !== active.id) {
      const position = positionForDrop(queryClient, active.id, over.id);
      if (position !== null)
        updateBookmark({ id: active.id, data: { position } });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        <FolderSidebar />
        <BookmarksView />
        <ShortcutsDialog />
        <Suspense fallback={null}>
          {isPaletteOpen && <CommandPalette onClose={closePalette} />}
          {isSettingsOpen && <SettingsModal />}
        </Suspense>
      </div>
    </DndContext>
  );
}

function ServerUnreachable({ onRetry }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-200">
      <p className="text-sm">Can&apos;t reach the server right now.</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Try again
      </button>
    </div>
  );
}

function Home() {
  const { data: user, isLoading, isError, refetch } = useAuth();
  if (isLoading) return <Spinner />;
  // Returned from signing in with a link waiting to be saved.
  if (
    user &&
    sessionStorage.getItem("pending-save") &&
    location.pathname !== "/save"
  )
    return <Navigate to="/save" replace />;
  // Same for a Claude connection that needed a sign-in first.
  if (user && sessionStorage.getItem("pending-connect"))
    return <Navigate to="/connect" replace />;
  // Never show the sign-in page just because the check failed.
  if (isError && !user) return <ServerUnreachable onRetry={refetch} />;
  return user ? <Workspace /> : <LandingPage />;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route
          path="/public/:username/:slug"
          element={<PublicCollectionView />}
        />
        <Route path="/save" element={<SavePage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}
