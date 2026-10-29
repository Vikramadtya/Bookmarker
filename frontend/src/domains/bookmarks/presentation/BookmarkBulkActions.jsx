import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOutput, Loader2, Trash2, Plus } from "lucide-react";

export default function BookmarkBulkActions({
  selectedBookmarks,
  showMoveMenu,
  setShowMoveMenu,
  bulkMoveBookmarks,
  clearBookmarkSelection,
  folders,
  bulkDeleteBookmarks,
}) {
  return (
    <AnimatePresence>
      {selectedBookmarks.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 text-white shadow-xl dark:bg-slate-800"
        >
          <div className="flex items-center gap-2 border-r border-slate-700 px-3 py-1 text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold">
              {selectedBookmarks.size}
            </span>
            Selected
          </div>

          <div className="relative flex items-center gap-1 px-1">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              <FolderOutput className="h-4 w-4" />
              Move
            </button>

            <AnimatePresence>
              {showMoveMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-48 origin-bottom-left rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="no-scrollbar max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        bulkMoveBookmarks.mutate(
                          {
                            ids: Array.from(selectedBookmarks),
                            folderId: null,
                          },
                          {
                            onSuccess: () => {
                              clearBookmarkSelection();
                              setShowMoveMenu(false);
                            },
                          }
                        );
                      }}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Inbox (No Folder)
                    </button>

                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          bulkMoveBookmarks.mutate(
                            {
                              ids: Array.from(selectedBookmarks),
                              folderId: folder.id,
                            },
                            {
                              onSuccess: () => {
                                clearBookmarkSelection();
                                setShowMoveMenu(false);
                              },
                            }
                          );
                        }}
                        className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => {
                bulkDeleteBookmarks.mutate(Array.from(selectedBookmarks), {
                  onSuccess: () => clearBookmarkSelection(),
                });
              }}
              disabled={bulkDeleteBookmarks.isPending}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-slate-800 disabled:opacity-50 dark:hover:bg-slate-700"
            >
              {bulkDeleteBookmarks.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
          <button
            onClick={() => clearBookmarkSelection()}
            className="ml-1 rounded-full p-1.5 transition-colors hover:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
