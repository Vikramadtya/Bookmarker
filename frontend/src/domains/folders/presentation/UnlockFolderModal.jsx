import React from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { makeApiRequest } from "@/lib/utils";

export default function UnlockFolderModal({
  unlockFolderInfo,
  setUnlockFolderInfo,
  unlockPassword,
  setUnlockPassword,
  unlockError,
  setUnlockError,
  isUnlocking,
  setIsUnlocking,
  activeFolder,
  setActiveFolder,
}) {
  if (!unlockFolderInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Lock className="h-5 w-5 text-blue-500" />
          Unlock Collection
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter the password to unlock <strong>{unlockFolderInfo.name}</strong>.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setIsUnlocking(true);
            setUnlockError("");
            try {
              const data = await makeApiRequest({
                url: `/api/v1/folders/${unlockFolderInfo.id}/unlock`,
                method: "POST",
                body: { password: unlockPassword },
              });
              const tokens = JSON.parse(
                sessionStorage.getItem("folder_tokens") || "{}"
              );
              tokens[unlockFolderInfo.id] = data.token;
              sessionStorage.setItem("folder_tokens", JSON.stringify(tokens));

              // Refetch active folder if we are already viewing it to load the bookmarks
              if (activeFolder.includes(unlockFolderInfo.id)) {
                setActiveFolder(activeFolder);
              }

              toast.success("Folder unlocked!");
              setUnlockFolderInfo(null);
              setUnlockPassword("");
            } catch (error) {
              setUnlockError(error.message || "Invalid password");
            } finally {
              setIsUnlocking(false);
            }
          }}
        >
          <input
            type="password"
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
          />
          {unlockError && <p className="text-xs text-red-500">{unlockError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            disabled={isUnlocking}
          >
            {isUnlocking ? "Unlocking..." : "Unlock"}
          </button>
          <button
            type="button"
            onClick={() => {
              setUnlockFolderInfo(null);
              setUnlockPassword("");
              setUnlockError("");
            }}
            className="w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:ring-2 focus:ring-slate-500/50 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
