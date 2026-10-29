import { lazy, Suspense, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Bookmark,
  Edit2,
  Folder,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { Favicon } from "@/shared/ui/Favicon";
import { FavoriteButton } from "@/shared/ui/FavoriteButton";
import { cn } from "@/lib/utils";
import BookmarkPreview from "./BookmarkPreview";
import BookmarkNotes from "./BookmarkNotes";
import BookmarkMetadata from "./BookmarkMetadata";
import { displayTitle } from "./bookmarkText";

const ReaderView = lazy(() => import("./ReaderView"));

export default function BookmarkDetail() {
  const selectedId = useAppStore((s) => s.selectedBookmarkId);
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openMoveModal = useAppStore((s) => s.openMoveModal);
  const { data: bookmark } = useBookmark(selectedId);
  const { mutate: updateBookmark } = useUpdateBookmark();
  const [isReaderOpen, setIsReaderOpen] = useState(false);

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
      <m.div
        key={bookmark.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="border-b border-slate-100 bg-white p-8 dark:border-slate-800/60 dark:bg-slate-950">
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <FavoriteButton
              isFavorite={bookmark.isFavorite}
              onClick={() =>
                updateBookmark({
                  id: bookmark.id,
                  data: { isFavorite: !bookmark.isFavorite },
                })
              }
              className={cn(
                "flex items-center justify-center rounded-lg border px-3 py-1.5 shadow-sm active:scale-95",
                bookmark.isFavorite
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              )}
            />
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
            {bookmark.isArticle && (
              <button
                onClick={() => setIsReaderOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              >
                <BookOpen className="h-4 w-4 stroke-[1.5]" />
                <span>Reader</span>
              </button>
            )}
          </div>

          <div className="mb-6 flex items-start gap-5">
            <Favicon
              src={bookmark.logoURL}
              className="h-16 w-16 rounded-2xl p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              iconClassName="h-6 w-6"
            />
            <div className="pt-1">
              <h2 className="mb-2 flex items-center gap-2 text-2xl leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                {displayTitle(bookmark)}
                {bookmark.isDeadLink && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 stroke-[2]" />
                    Dead Link
                  </span>
                )}
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

          <BookmarkNotes bookmark={bookmark} />

          <BookmarkMetadata bookmark={bookmark} />
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 dark:bg-slate-950/50">
          <BookmarkPreview url={bookmark.bookmarkURL} />
        </div>

        {isReaderOpen && (
          <Suspense fallback={null}>
            <ReaderView
              bookmark={bookmark}
              isOpen
              onClose={() => setIsReaderOpen(false)}
            />
          </Suspense>
        )}
      </m.div>
    </AnimatePresence>
  );
}
