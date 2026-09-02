import { useState } from "react";
import { useCreateFolder } from "./useFolders";

/**
 * Manages the inline folder-creation input that appears inside the sidebar.
 *
 * `showInputFor` is the ID of the parent whose "add folder" input is currently
 * visible — 'root' for a top-level collection, or a collectionId for a
 * sub-folder. Null means no input is shown.
 *
 * @param {function} onSuccess  Called after a folder is successfully created.
 *                              Receives the created folder object.
 */
export function useFolderCreation({ onSuccess } = {}) {
  const [showInputFor, setShowInputFor] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");

  const createFolder = useCreateFolder();

  const openInputFor = (parentId) => {
    setShowInputFor(parentId);
    setNewFolderName("");
  };

  const closeInput = () => {
    setShowInputFor(null);
    setNewFolderName("");
  };

  const handleCreateFolder = async (e, parentId = null) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    createFolder.mutate(
      { name: newFolderName.trim(), parentId },
      {
        onSuccess: (created) => {
          closeInput();
          onSuccess?.(created, parentId);
        },
      }
    );
  };

  return {
    showInputFor,
    newFolderName,
    setNewFolderName,
    openInputFor,
    closeInput,
    handleCreateFolder,
    isPending: createFolder.isPending,
  };
}
