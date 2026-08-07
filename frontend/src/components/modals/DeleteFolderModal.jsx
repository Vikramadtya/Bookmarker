import React from "react";

export default function DeleteFolderModal({
  folderToDelete,
  confirmDelete,
  isPending,
  setFolderToDelete,
}) {
  if (!folderToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Delete Folder
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          You are about to delete <strong>{folderToDelete.name}</strong>. What
          would you like to do with its bookmarks?
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => confirmDelete("move_to_inbox")}
            className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            disabled={isPending}
          >
            Move to Inbox & Delete
          </button>
          <button
            onClick={() => confirmDelete("delete_bookmarks")}
            className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
            disabled={isPending}
          >
            Delete Folder & Bookmarks
          </button>
          <button
            onClick={() => setFolderToDelete(null)}
            className="w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:ring-2 focus:ring-slate-500/50 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
