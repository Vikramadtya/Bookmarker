import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Archive,
  CheckCheck,
  FolderOutput,
  Pin,
  Plus,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useFolders } from "@/domains/folders/application/useFolders";
import {
  useBulkMoveBookmarks,
  useTags,
} from "@/domains/bookmarks/application/useBookmarks";
import { useBulkUpdate } from "@/domains/organize/application/useOrganize";
import { useUndoableDelete } from "@/domains/bookmarks/application/useUndoableDelete";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-slate-800 dark:hover:bg-slate-700";

function Popover({ children }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-2 w-52 origin-bottom-left rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      {children}
    </m.div>
  );
}

export default function BookmarkBulkActions() {
  const selectedBookmarks = useAppStore((s) => s.selectedBookmarks);
  const clearSelection = useAppStore((s) => s.clearBookmarkSelection);
  const { data: folders = [] } = useFolders();
  const { data: tags = [] } = useTags();
  const bulkMove = useBulkMoveBookmarks();
  const bulkUpdate = useBulkUpdate();
  const scheduleDelete = useUndoableDelete();
  const [menu, setMenu] = useState(null); // 'move' | 'tag' | null
  const [tagText, setTagText] = useState("");

  const ids = () => Array.from(selectedBookmarks);
  const done = () => {
    clearSelection();
    setMenu(null);
    setTagText("");
  };
  const change = (changes) =>
    bulkUpdate.mutate({ ids: ids(), ...changes }, { onSuccess: done });
  const moveTo = (folderId) =>
    bulkMove.mutate({ ids: ids(), folderId }, { onSuccess: done });
  const addTag = (tag) => tag.trim() && change({ addTags: [tag.trim()] });

  const matches = tags
    .filter((t) => t.tag.toLowerCase().includes(tagText.toLowerCase()))
    .slice(0, 5);

  return (
    <AnimatePresence>
      {selectedBookmarks.size > 0 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-6 left-1/2 z-50 flex max-w-[95%] -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 text-white shadow-xl dark:bg-slate-800"
        >
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3 pl-2 text-sm font-medium whitespace-nowrap">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold">
              {selectedBookmarks.size}
            </span>
          </div>

          <div className="relative flex items-center gap-0.5 px-1">
            <button
              onClick={() => setMenu(menu === "move" ? null : "move")}
              className={iconButton}
              title="Move to folder"
              aria-label="Move to folder"
            >
              <FolderOutput className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMenu(menu === "tag" ? null : "tag")}
              className={iconButton}
              title="Add a tag"
              aria-label="Add a tag"
            >
              <Tag className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {menu === "move" && (
                <Popover>
                  <div className="no-scrollbar max-h-60 overflow-y-auto">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => moveTo(folder.id)}
                        className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </Popover>
              )}
              {menu === "tag" && (
                <Popover>
                  <input
                    autoFocus
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag(tagText)}
                    placeholder="Tag name, Enter to add"
                    className="mb-1 w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
                  />
                  {matches.map((t) => (
                    <button
                      key={t.tag}
                      onClick={() => addTag(t.tag)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {t.tag}
                      <span className="text-[10px] text-slate-400">
                        {t.count}
                      </span>
                    </button>
                  ))}
                </Popover>
              )}
            </AnimatePresence>

            <button
              onClick={() => change({ isFavorite: true })}
              className={iconButton}
              title="Favorite"
              aria-label="Favorite"
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              onClick={() => change({ pinned: true })}
              className={iconButton}
              title="Pin"
              aria-label="Pin"
            >
              <Pin className="h-4 w-4" />
            </button>
            <button
              onClick={() => change({ status: "done" })}
              className={iconButton}
              title="Mark read"
              aria-label="Mark read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={() => change({ status: "archived" })}
              className={iconButton}
              title="Archive"
              aria-label="Archive"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                scheduleDelete(ids());
                done();
              }}
              className={`${iconButton} text-red-400`}
              title="Delete (with undo)"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="ml-1 rounded-full p-1.5 transition-colors hover:bg-slate-800 dark:hover:bg-slate-700"
            aria-label="Clear selection"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
