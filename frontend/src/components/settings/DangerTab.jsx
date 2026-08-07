import React from "react";
import { Trash2 } from "lucide-react";

export default function DangerTab({
  deleteConfirmText,
  setDeleteConfirmText,
  handleDeleteAll,
  deleteAllData,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400">
          Danger Zone
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Irreversible actions for your account data.
        </p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
        <div className="mb-2 flex items-center gap-3 font-medium text-red-700 dark:text-red-400">
          <Trash2 className="h-5 w-5" />
          Delete All Data
        </div>
        <p className="mb-4 text-sm text-red-600/80 dark:text-red-400/80">
          This will permanently delete all your folders and bookmarks. This
          action cannot be undone.
        </p>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            onClick={handleDeleteAll}
            disabled={deleteConfirmText !== "DELETE" || deleteAllData.isPending}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500/50 focus:outline-none disabled:opacity-50"
          >
            {deleteAllData.isPending ? "Deleting..." : "Delete All My Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
