import React from "react";
import { Globe, Eye, EyeOff, Lock, Unlock, Trash2 } from "lucide-react";

export default function FolderContextMenu({
  contextMenu,
  setContextMenu,
  setPublicModalFolder,
  updateFolder,
  handleDeleteFolderClick,
}) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu(null);
      }}
    >
      <div
        className="absolute z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <button
          onClick={() => {
            setPublicModalFolder(contextMenu.folder);
            setContextMenu(null);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Globe className="h-4 w-4" />
          {contextMenu.folder.isPublic ? "Public Settings" : "Make Public"}
        </button>

        <button
          onClick={() => {
            updateFolder.mutate({
              id: contextMenu.folder.id,
              data: { isHidden: !contextMenu.folder.isHidden },
            });
            setContextMenu(null);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {contextMenu.folder.isHidden ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          {contextMenu.folder.isHidden ? "Show Collection" : "Hide Collection"}
        </button>

        <button
          onClick={() => {
            if (contextMenu.folder.isLocked) {
              updateFolder.mutate({
                id: contextMenu.folder.id,
                data: { isLocked: false },
              });
            } else {
              const pwd = window.prompt(
                "Enter a password to lock this collection:"
              );
              if (pwd)
                updateFolder.mutate({
                  id: contextMenu.folder.id,
                  data: { password: pwd },
                });
            }
            setContextMenu(null);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {contextMenu.folder.isLocked ? (
            <Unlock className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {contextMenu.folder.isLocked
            ? "Remove Password"
            : "Lock with Password"}
        </button>

        <button
          onClick={() => handleDeleteFolderClick(contextMenu.folder.id)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
