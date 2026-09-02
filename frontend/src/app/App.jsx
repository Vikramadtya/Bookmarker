import FolderSidebar from "@/domains/folders/presentation/FolderSideBar";
import BookmarksView from "@/domains/bookmarks/presentation/BookmarksView";
import { CommandPalette } from "@/domains/bookmarks/presentation/CommandPalette";
import SettingsModal from "@/domains/identity/presentation/SettingsModal";
import LandingPage from "@/pages/LandingPage";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useUpdateBookmark } from "@/domains/bookmarks/application/useBookmarks";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/domains/identity/application/useAuth";
import { Routes, Route } from "react-router-dom";
import PublicCollectionView from "@/pages/PublicCollectionView";

export default function App() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const updateBookmark = useUpdateBookmark();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Check if dragging a bookmark over a folder
    if (
      active.data.current?.type === "bookmark" &&
      over.data.current?.type === "folder"
    ) {
      const bookmarkId = active.id;
      const targetFolderId = over.id;

      updateBookmark.mutate(
        {
          id: bookmarkId,
          data: { folderId: targetFolderId === "root" ? null : targetFolderId },
        },
        {
          onSuccess: () => toast.success("Moved bookmark"),
        }
      );
    }
  };

  // We let the Routes handle auth so that public routes are accessible
  const renderApp = () => {
    if (isAuthLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white" />
        </div>
      );
    }
    if (!user) {
      return <LandingPage />;
    }
    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex h-screen overflow-hidden bg-white font-sans text-slate-900 transition-colors duration-200 selection:bg-blue-500/30 dark:bg-slate-950 dark:text-slate-100">
          <FolderSidebar />
          <BookmarksView />
          <CommandPalette />
          <SettingsModal />
        </div>
      </DndContext>
    );
  };

  return (
    <Routes>
      <Route
        path="/public/:username/:slug"
        element={<PublicCollectionView />}
      />
      <Route path="*" element={renderApp()} />
    </Routes>
  );
}
