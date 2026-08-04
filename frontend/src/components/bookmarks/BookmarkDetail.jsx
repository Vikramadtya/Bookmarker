import dayjs from "@/lib/dayjs";
import {
  ExternalLink,
  Bookmark,
  Edit2,
  MessageSquare,
  Plus,
  Loader2,
  Folder,
} from "lucide-react";
import BookmarkPreview from "./BookmarkPreview";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useUpdateBookmark } from "@/hooks/useBookmarks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export default function BookmarkDetail() {
  const {
    selectedBookmark: bookmark,
    setSelectedBookmark,
    openBookmarkModal,
    openMoveModal,
  } = useAppStore();
  const [imageError, setImageError] = useState(false);
  const [newNote, setNewNote] = useState("");
  const updateBookmark = useUpdateBookmark();

  useEffect(() => {
    setImageError(false);
  }, [bookmark?.id]);
  if (!bookmark) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white text-slate-400 dark:bg-slate-950 dark:text-slate-500">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Bookmark className="h-8 w-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium">Select a bookmark to view details</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={bookmark.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="border-b border-slate-100 bg-white p-8 dark:border-slate-800/60 dark:bg-slate-950">
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={() => {
                const newIsFavorite = !bookmark.isFavorite;
                setSelectedBookmark({ ...bookmark, isFavorite: newIsFavorite });
                updateBookmark.mutate({
                  id: bookmark.id,
                  data: { isFavorite: newIsFavorite },
                });
              }}
              title={
                bookmark.isFavorite
                  ? "Remove from Favorites"
                  : "Add to Favorites"
              }
              className={cn(
                "flex items-center justify-center rounded-lg border px-3 py-1.5 shadow-sm transition-all active:scale-95",
                bookmark.isFavorite
                  ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={bookmark.isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <button
              onClick={() => openMoveModal(bookmark)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Folder className="h-4 w-4 stroke-[1.5]" />
              <span>Move</span>
            </button>
            <button
              onClick={() => openBookmarkModal("edit", bookmark)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Edit2 className="h-4 w-4 stroke-[1.5]" />
              <span>Edit</span>
            </button>
          </div>

          <div className="mb-6 flex items-start gap-5">
            {bookmark.logoURL && !imageError ? (
              <img
                src={bookmark.logoURL}
                alt="Logo"
                className="h-16 w-16 rounded-2xl border border-slate-100 bg-white object-contain p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Bookmark className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              </div>
            )}
            <div className="pt-1">
              <h2 className="mb-2 text-2xl leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                {bookmark.title || "Untitled"}
              </h2>
              <a
                href={bookmark.bookmarkURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <span className="max-w-md truncate">
                  {bookmark.bookmarkURL}
                </span>
                <ExternalLink className="h-3.5 w-3.5 stroke-[1.5]" />
              </a>
            </div>
          </div>

          {bookmark.description && (
            <div className="mb-6">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {bookmark.description}
              </p>
            </div>
          )}

          <div className="mb-6 space-y-3">
            <div className="mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Notes
              </h3>
            </div>

            {bookmark.comments?.length > 0 && (
              <div className="mb-3 space-y-2">
                {bookmark.comments.map((comment, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {comment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form
              className="relative flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newNote.trim()) return;

                const updatedComments = [
                  ...(bookmark.comments || []),
                  newNote.trim(),
                ];

                // Optimistically update local view
                setSelectedBookmark({ ...bookmark, comments: updatedComments });

                updateBookmark.mutate(
                  {
                    id: bookmark.id,
                    data: { comments: updatedComments },
                  },
                  {
                    onSuccess: () => setNewNote(""),
                  }
                );
              }}
            >
              <input
                type="text"
                placeholder="Add a new note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                disabled={updateBookmark.isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || updateBookmark.isPending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {updateBookmark.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                Created
              </p>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {dayjs(bookmark.creationDate).format("MMM D, YYYY")}
              </p>
            </div>
            {bookmark.tags?.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Tags
                </p>
                <div className="flex gap-2">
                  {bookmark.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 dark:bg-slate-950/50">
          <BookmarkPreview url={bookmark.bookmarkURL} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
