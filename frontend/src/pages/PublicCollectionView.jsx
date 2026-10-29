import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import { getFolderToken, setFolderToken } from "@/lib/folderTokens";
import { Bookmark, Folder, Loader2, Lock } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { Favicon } from "@/shared/ui/Favicon";
import { useState } from "react";

export default function PublicCollectionView() {
  const { username, slug } = useParams();
  const queryClient = useQueryClient();
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const queryKey = ["shared-folder", username, slug];
  // One request returns the folder and, unless it is locked, its bookmarks.
  const {
    data: folder,
    isLoading: isFolderLoading,
    error: folderError,
  } = useQuery({
    queryKey,
    queryFn: () =>
      makeApiRequest({
        url: `${BASE_URL}/shared/${username}/${slug}`,
        headers: getFolderToken(slug)
          ? { "x-folder-token": getFolderToken(slug) }
          : undefined,
        meta: { silent: true },
      }),
    retry: false,
  });

  const bookmarks = folder?.bookmarks;

  if (isFolderLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (folderError || !folder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <Folder className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Folder Not Found
        </h1>
        <p className="mt-2 text-center text-slate-500 dark:text-slate-400">
          This folder doesn't exist or is not public.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl p-6 sm:p-12">
        {/* Header */}
        <div className="mb-12 border-b border-slate-200 pb-8 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {folder.name}
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Shared Collection • {bookmarks?.length || 0} links
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Bookmarker
              </span>
            </div>
          </div>
        </div>

        {bookmarks === null ? (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Lock className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Protected Collection
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This collection is locked. Enter the password to view its
                contents.
              </p>
            </div>

            <form
              className="mt-8 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsUnlocking(true);
                setUnlockError("");
                try {
                  const data = await makeApiRequest({
                    url: `${BASE_URL}/shared/${username}/${slug}/unlock`,
                    method: "POST",
                    body: { password: unlockPassword },
                    meta: { silent: true },
                  });
                  setFolderToken(slug, data.token);
                  await queryClient.invalidateQueries({ queryKey });
                } catch (err) {
                  setUnlockError("Invalid password. Please try again.");
                } finally {
                  setIsUnlocking(false);
                }
              }}
            >
              <div>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  autoFocus
                />
                {unlockError && (
                  <p className="mt-2 text-sm text-red-500">{unlockError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isUnlocking}
                className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isUnlocking ? "Unlocking..." : "Unlock"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Bookmarks Grid */}
            {bookmarks?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <Bookmark className="mb-4 h-12 w-12 stroke-[1.5] text-slate-300 dark:text-slate-700" />
                <p>This collection is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarks.map((b) => (
                  <a
                    key={b.id}
                    href={b.bookmarkURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <Favicon
                          src={b.logoURL}
                          className="h-10 w-10"
                          iconClassName="h-5 w-5"
                        />
                      </div>
                      <h3 className="mb-2 line-clamp-2 text-base leading-snug font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {b.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                        {b.description}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-50 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-800/20">
                      <span className="truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                        {new URL(b.bookmarkURL).hostname}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {dayjs(b.creationDate).format("MMM D, YYYY")}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
