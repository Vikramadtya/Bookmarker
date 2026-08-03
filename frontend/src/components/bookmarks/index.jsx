import { useAppStore } from "@/store/useAppStore";
import BookmarkList from "./BookmarkList";
import BookmarkDetail from "./BookmarkDetail";
import { useSearchParams } from "react-router-dom";
import { useCreateBookmark, useUpdateBookmark } from "@/hooks/useBookmarks";
import ModalForm from "@/components/modalForm/modalForm";

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
      <div className="flex-1 bg-white">
        <BookmarkDetail />
      </div>

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
