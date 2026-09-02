import { useAppStore } from "@/store/useAppStore";
import BookmarkList from "./BookmarkList";
import BookmarkDetail from "./BookmarkDetail";
import { useSearchParams } from "react-router-dom";
import {
  useCreateBookmark,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import ModalForm from "@/domains/bookmarks/presentation/modalForm/ModalForm";
import MoveBookmarkModal from "./MoveBookmarkModal";

export default function BookmarksView() {
  const [searchParams] = useSearchParams();
  const activeFolder = searchParams.get("folder") || "root";

  const { bookmarkFormModal, closeBookmarkModal } = useAppStore();

  const createBookmark = useCreateBookmark();
  const updateBookmark = useUpdateBookmark();

  const handleFormSubmit = (data) => {
    if (bookmarkFormModal.type === "edit") {
      updateBookmark.mutate(
        {
          id: bookmarkFormModal.data.id,
          data,
        },
        {
          onSuccess: () => closeBookmarkModal(),
        }
      );
    } else {
      createBookmark.mutate(data, {
        onSuccess: () => closeBookmarkModal(),
      });
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
        <ModalForm
          onClose={closeBookmarkModal}
          onSubmit={handleFormSubmit}
          initialData={bookmarkFormModal.data}
          activeFolderId={activeFolder}
        />
      )}
    </>
  );
}
