import { motion, AnimatePresence } from "framer-motion";
import { Folder, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useFolders } from "@/hooks/useFolders";
import { useUpdateBookmark } from "@/hooks/useBookmarks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MoveBookmarkModal() {
  const { moveBookmarkModal, closeMoveModal } = useAppStore();
  const { data: folders = [] } = useFolders();
  const updateBookmark = useUpdateBookmark();

  const handleMove = (targetFolderId) => {
    updateBookmark.mutate(
      {
        id: moveBookmarkModal.bookmark.id,
        data: { folderId: targetFolderId === "root" ? null : targetFolderId },
      },
      {
        onSuccess: () => {
          toast.success("Bookmark moved successfully");
          closeMoveModal();
        },
      }
    );
  };

  if (!moveBookmarkModal.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeMoveModal}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/80"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800/60">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Move Bookmark
            </h2>
            <button
              onClick={closeMoveModal}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <button
              onClick={() => handleMove("root")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                moveBookmarkModal.bookmark?.folderId === null
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
              )}
            >
              <Folder className="h-4 w-4" />
              <span>Inbox (No Folder)</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  moveBookmarkModal.bookmark?.folderId === folder.id
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                )}
              >
                <Folder className="h-4 w-4" />
                <span>{folder.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
