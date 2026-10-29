import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import {
  useCreateBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import BookmarkList from "./BookmarkList";
import BookmarkDetail from "./BookmarkDetail";
import MoveBookmarkModal from "./MoveBookmarkModal";

const ModalForm = lazy(
  () => import("@/domains/bookmarks/presentation/modalForm/ModalForm")
);

export default function BookmarksView() {
  const [searchParams] = useSearchParams();
  const activeFolder = searchParams.get("folder") || "root";

  const bookmarkFormModal = useAppStore((s) => s.bookmarkFormModal);
  const closeBookmarkModal = useAppStore((s) => s.closeBookmarkModal);
  const setSelectedId = useAppStore((s) => s.setSelectedBookmarkId);
  const clearBookmarkSelection = useAppStore((s) => s.clearBookmarkSelection);

  useEffect(() => {
    setSelectedId(null);
    clearBookmarkSelection();
  }, [activeFolder, setSelectedId, clearBookmarkSelection]);

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
      <BookmarkList activeFolder={activeFolder} />
      <div className="flex-1 bg-white dark:bg-slate-950">
        <BookmarkDetail />
      </div>

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
