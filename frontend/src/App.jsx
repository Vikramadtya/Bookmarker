import FolderSidebar from "@/components/sidebar/folderSideBar";
import BookmarksView from "@/components/bookmarks";
import { CommandPalette } from "@/components/CommandPalette";
import SettingsModal from "@/components/settings/SettingsModal";
import LandingPage from "@/components/LandingPage";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useUpdateBookmark } from "@/hooks/useBookmarks";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

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
}
