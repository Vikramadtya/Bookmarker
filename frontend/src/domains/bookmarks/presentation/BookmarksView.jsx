import { lazy, Suspense, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  useCreateBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import { useNav } from "@/domains/organize/application/useNav";
import BookmarkList from "./BookmarkList";
import BookmarkDetail from "./BookmarkDetail";
import MoveBookmarkModal from "./MoveBookmarkModal";

// Full-page tools, loaded when first opened.
const TriageView = lazy(
  () => import("@/domains/organize/presentation/TriageView")
);
const TagsPage = lazy(() => import("@/domains/organize/presentation/TagsPage"));
const DuplicatesView = lazy(
  () => import("@/domains/organize/presentation/DuplicatesView")
);
const DigestView = lazy(
  () => import("@/domains/organize/presentation/DigestView")
);
const PAGES = {
  triage: TriageView,
  tags: TagsPage,
  duplicates: DuplicatesView,
  digest: DigestView,
};

const ModalForm = lazy(
  () => import("@/domains/bookmarks/presentation/modalForm/ModalForm")
);

export default function BookmarksView() {
  const { page, folder: activeFolder, view } = useNav();
  const viewKey = view?.id ?? "";
  const Page = PAGES[page];

  const bookmarkFormModal = useAppStore((s) => s.bookmarkFormModal);
  const closeBookmarkModal = useAppStore((s) => s.closeBookmarkModal);
  const selectedId = useAppStore((s) => s.selectedBookmarkId);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);
  const clearBookmarkSelection = useAppStore((s) => s.clearBookmarkSelection);

  useEffect(() => {
    setSelectedId(null);
    clearBookmarkSelection();
  }, [activeFolder, viewKey, page, setSelectedId, clearBookmarkSelection]);

  const createBookmark = useCreateBookmark();
  const updateBookmark = useUpdateBookmark();

  const handleFormSubmit = (data) => {
    const done = { onSuccess: closeBookmarkModal };
    if (bookmarkFormModal.type === "edit") {
      updateBookmark.mutate({ id: bookmarkFormModal.data.id, data }, done);
    } else {
      createBookmark.mutate(data, done);
    }
  };

  return (
    <>
      {Page ? (
        <Suspense fallback={<div className="flex-1" />}>
          <Page />
        </Suspense>
      ) : (
        <BookmarkList activeFolder={activeFolder} view={view} />
      )}
      {/* Below md the detail panel takes over the whole screen once a bookmark is open. */}
      {!Page && (
        <div
          className={cn(
            "flex-1 bg-white md:block dark:bg-slate-950",
            selectedId
              ? "fixed inset-0 z-30 overflow-y-auto md:static md:z-auto"
              : "hidden"
          )}
        >
          <BookmarkDetail />
        </div>
      )}

      <MoveBookmarkModal />

      {bookmarkFormModal.isOpen && (
        <Suspense fallback={null}>
          <ModalForm
            key={bookmarkFormModal.data?.id || "create"}
            onClose={closeBookmarkModal}
            onSubmit={handleFormSubmit}
            initialData={bookmarkFormModal.data}
            activeFolderId={activeFolder}
          />
        </Suspense>
      )}
    </>
  );
}
