import { lazy, Suspense, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  BellRing,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  useBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { Favicon } from "@/shared/ui/Favicon";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Thumbnail } from "@/shared/ui/Thumbnail";
import { cn } from "@/lib/utils";
import BookmarkPreview from "./BookmarkPreview";
import BookmarkNotes from "./BookmarkNotes";
import DetailActions from "./DetailActions";
import { formatRevisit } from "@/lib/revisit";
import BookmarkHighlights from "./BookmarkHighlights";
import Suggestions from "@/domains/organize/presentation/Suggestions";
import { useRecordOpen } from "@/domains/organize/application/useOrganize";
import { displayTitle, hostnameOf, isPending, timeAgo } from "./bookmarkText";

const ReaderView = lazy(() => import("./ReaderView"));

const actionButton =
  "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-soft hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";

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
  const { data: bookmark } = useBookmark(selectedId);
  const { mutate: updateBookmark } = useUpdateBookmark();
  const recordOpen = useRecordOpen();
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [notingId, setNotingId] = useState(null); // asked to add a note

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
            <DetailActions
              key={bookmark.id}
              bookmark={bookmark}
              onRead={() => setIsReaderOpen(true)}
              onAddNote={() => setNotingId(bookmark.id)}
            />
          </div>

          {bookmark.isDeadLink && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>This link no longer works.</span>
              {bookmark.isArticle && (
                <button
                  onClick={() => setIsReaderOpen(true)}
                  className="font-semibold underline underline-offset-2"
                >
                  Read the saved copy
                </button>
              )}
              <a
                href={`https://web.archive.org/web/*/${bookmark.bookmarkURL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Find it on archive.org
              </a>
            </div>
          )}

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
                onClick={() => recordOpen.mutate(bookmark.id)}
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
              {(bookmark.tags?.length > 0 || bookmark.revisitAt) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {bookmark.revisitAt && (
                    <button
                      onClick={() =>
                        updateBookmark({
                          id: bookmark.id,
                          data: { revisitAt: null },
                        })
                      }
                      title="Clear reminder"
                      className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      <BellRing className="h-3 w-3" />
                      {formatRevisit(bookmark.revisitAt)}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {bookmark.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {pending ? (
            <div className="mb-6 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          ) : (
            (bookmark.summary || bookmark.description) && (
              <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {bookmark.summary || bookmark.description}
              </p>
            )
          )}

          <Suggestions bookmark={bookmark} className="mb-6" />

          <BookmarkHighlights bookmark={bookmark} />

          {(bookmark.comments?.length > 0 || notingId === bookmark.id) && (
            <BookmarkNotes
              key={bookmark.id}
              bookmark={bookmark}
              autoFocus={notingId === bookmark.id}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5 md:p-8 dark:bg-slate-950/50">
          <BookmarkPreview key={bookmark.id} bookmark={bookmark} />
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
