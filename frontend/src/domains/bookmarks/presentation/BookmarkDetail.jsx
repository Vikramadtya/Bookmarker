import { lazy, Suspense, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
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
import { Skeleton } from "@/shared/ui/Skeleton";
import { Thumbnail } from "@/shared/ui/Thumbnail";
import { FavoriteButton } from "@/shared/ui/FavoriteButton";
import { cn } from "@/lib/utils";
import BookmarkPreview from "./BookmarkPreview";
import BookmarkNotes from "./BookmarkNotes";
import BookmarkMetadata from "./BookmarkMetadata";
import { displayTitle, hostnameOf, isPending, timeAgo } from "./bookmarkText";

const ReaderView = lazy(() => import("./ReaderView"));

const actionButton =
  "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-soft transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

const SHORTCUT_HINTS = [
  ["J / K", "browse"],
  ["/", "search"],
  ["N", "new"],
  ["?", "all shortcuts"],
];

function EmptyDetail() {
  return (
    <div className="animate-fade-up hidden h-full flex-col items-center justify-center bg-white text-slate-400 md:flex dark:bg-slate-950 dark:text-slate-500">
      <div className="shadow-soft mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <Bookmark className="h-8 w-8 stroke-[1.5] text-blue-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Select a bookmark to view details
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {SHORTCUT_HINTS.map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BookmarkDetail() {
  const selectedId = useAppStore((s) => s.selectedBookmarkId);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openMoveModal = useAppStore((s) => s.openMoveModal);
  const { data: bookmark } = useBookmark(selectedId);
  const { mutate: updateBookmark } = useUpdateBookmark();
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  if (!bookmark) return <EmptyDetail />;

  const pending = isPending(bookmark);

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
        <div className="border-b border-slate-100 bg-white p-5 md:p-8 dark:border-slate-800/60 dark:bg-slate-950">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedId(null)}
              className={cn(actionButton, "md:hidden")}
            >
              <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
              <span>Back</span>
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <FavoriteButton
                isFavorite={bookmark.isFavorite}
                onClick={() =>
                  updateBookmark({
                    id: bookmark.id,
                    data: { isFavorite: !bookmark.isFavorite },
                  })
                }
                className={cn(
                  "shadow-soft flex items-center justify-center rounded-lg border px-3 py-1.5 active:scale-95",
                  bookmark.isFavorite
                    ? "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                )}
              />
              <button
                onClick={() => openMoveModal(bookmark)}
                className={actionButton}
              >
                <Folder className="h-4 w-4 stroke-[1.5]" />
                <span>Move</span>
              </button>
              <button
                onClick={() => openBookmarkModal("edit", bookmark)}
                className={actionButton}
              >
                <Edit2 className="h-4 w-4 stroke-[1.5]" />
                <span>Edit</span>
              </button>
              {bookmark.isArticle && (
                <button
                  onClick={() => setIsReaderOpen(true)}
                  className="shadow-soft flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-blue-500 active:scale-95"
                >
                  <BookOpen className="h-4 w-4 stroke-[1.5]" />
                  <span>Reader</span>
                </button>
              )}
            </div>
          </div>

          {(bookmark.imageURL || pending) && (
            <Thumbnail
              bookmark={bookmark}
              pending={pending}
              className="shadow-soft mb-6 aspect-[21/9] w-full rounded-2xl"
            />
          )}

          <div className="mb-6 flex items-start gap-4">
            <Favicon
              src={bookmark.logoURL}
              className="shadow-soft h-14 w-14 rounded-2xl p-2 dark:border-slate-800 dark:bg-slate-900"
              iconClassName="h-6 w-6"
            />
            <div className="min-w-0 pt-0.5">
              {pending ? (
                <Skeleton className="mb-3 h-7 w-64 max-w-full" />
              ) : (
                <h2 className="mb-1.5 flex flex-wrap items-center gap-2 text-2xl leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                  {displayTitle(bookmark)}
                  {bookmark.isDeadLink && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5 stroke-[2]" />
                      Dead Link
                    </span>
                  )}
                </h2>
              )}
              <a
                href={bookmark.bookmarkURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <span className="truncate">
                  {hostnameOf(bookmark.bookmarkURL)}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
              </a>
              <p className="mt-0.5 text-xs text-slate-400">
                Saved {timeAgo(bookmark.creationDate)}
              </p>
            </div>
          </div>

          {pending ? (
            <div className="mb-6 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          ) : (
            bookmark.description && (
              <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {bookmark.description}
              </p>
            )
          )}

          <BookmarkNotes bookmark={bookmark} />

          <BookmarkMetadata bookmark={bookmark} />
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5 md:p-8 dark:bg-slate-950/50">
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
