import React from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";

export default function PublicFolderModal({
  publicModalFolder,
  setPublicModalFolder,
  updateFolder,
  user,
}) {
  if (!publicModalFolder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Globe className="h-5 w-5 text-blue-500" />
          Public Collection
        </h3>

        {!publicModalFolder.isPublic ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to make{" "}
              <strong>{publicModalFolder.name}</strong> public? Anyone with the
              link will be able to view it.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  updateFolder.mutate(
                    { id: publicModalFolder.id, data: { isPublic: true } },
                    {
                      onSuccess: (data) => {
                        toast.success("Folder is now public!");
                        setPublicModalFolder(data);
                      },
                    }
                  );
                }}
                className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                disabled={updateFolder.isPending}
              >
                {updateFolder.isPending ? "Updating..." : "Make Public"}
              </button>
              <button
                onClick={() => setPublicModalFolder(null)}
                className="w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:ring-2 focus:ring-slate-500/50 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={updateFolder.isPending}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This collection is public. Anyone with the link below can view it.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <input
                type="text"
                readOnly
                value={
                  user?.username && publicModalFolder.slug
                    ? `${window.location.origin}/public/${user.username}/${publicModalFolder.slug}`
                    : ""
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                onClick={() => {
                  if (user?.username && publicModalFolder.slug) {
                    const url = `${window.location.origin}/public/${user.username}/${publicModalFolder.slug}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Copied to clipboard!");
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Copy Link
              </button>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                onClick={() => {
                  updateFolder.mutate(
                    { id: publicModalFolder.id, data: { isPublic: false } },
                    {
                      onSuccess: (data) => {
                        toast.success("Folder is now private.");
                        setPublicModalFolder(null);
                      },
                    }
                  );
                }}
                className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                disabled={updateFolder.isPending}
              >
                {updateFolder.isPending ? "Updating..." : "Make Private"}
              </button>
              <button
                onClick={() => setPublicModalFolder(null)}
                className="w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:ring-2 focus:ring-slate-500/50 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={updateFolder.isPending}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
