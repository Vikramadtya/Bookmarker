import { useState } from "react";
import {
  BellRing,
  BookOpen,
  Edit2,
  ExternalLink,
  Folder,
  MoreHorizontal,
  Pin,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/viewDefs";
import { REVISIT_PRESETS } from "@/lib/revisit";
import { useAppStore } from "@/store/useAppStore";
import { useUpdateBookmark } from "@/domains/bookmarks/application/useBookmarks";
import { useUndoableDelete } from "@/domains/bookmarks/application/useUndoableDelete";
import { useRecordOpen } from "@/domains/organize/application/useOrganize";
import { FavoriteButton } from "@/shared/ui/FavoriteButton";

const STATUSES = ["unread", "reading", "done", "archived"];

const secondary =
  "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-soft transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";
const item =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";

/** The few actions used all the time, with the rest under "More". */
export default function DetailActions({ bookmark, onRead, onAddNote }) {
  const [open, setOpen] = useState(false);
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openMoveModal = useAppStore((s) => s.openMoveModal);
  const { mutate: update } = useUpdateBookmark();
  const recordOpen = useRecordOpen();
  const scheduleDelete = useUndoableDelete();

  const change = (data) => update({ id: bookmark.id, data });
  /** Closes the menu, then does the thing. */
  const run = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <a
        href={bookmark.bookmarkURL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => recordOpen.mutate(bookmark.id)}
        className="shadow-soft flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
      >
        Open <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {bookmark.isArticle && (
        <button onClick={onRead} className={secondary}>
          <BookOpen className="h-4 w-4 stroke-[1.5]" />
          Reader
        </button>
      )}
      <select
        aria-label="Read status"
        value={bookmark.status}
        onChange={(e) => change({ status: e.target.value })}
        className={cn(secondary, "cursor-pointer outline-none")}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <FavoriteButton
        isFavorite={bookmark.isFavorite}
        onClick={() => change({ isFavorite: !bookmark.isFavorite })}
        className={cn(
          "shadow-soft flex items-center justify-center rounded-lg border px-3 py-1.5 active:scale-95",
          bookmark.isFavorite
            ? "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40"
            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        )}
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More actions"
          title="More actions"
          className={cn(secondary, "px-2")}
        >
          <MoreHorizontal className="h-5 w-5 stroke-[1.5]" />
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              className="animate-pop shadow-lift absolute top-10 right-0 z-30 w-56 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                role="menuitem"
                className={item}
                onClick={run(() => openBookmarkModal("edit", bookmark))}
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
              <button
                role="menuitem"
                className={item}
                onClick={run(() => openMoveModal(bookmark))}
              >
                <Folder className="h-4 w-4" /> Move
              </button>
              <button
                role="menuitem"
                className={item}
                onClick={run(() => change({ pinned: !bookmark.pinned }))}
              >
                <Pin
                  className={cn("h-4 w-4", bookmark.pinned && "fill-current")}
                />
                {bookmark.pinned ? "Unpin" : "Pin to top"}
              </button>
              <button role="menuitem" className={item} onClick={run(onAddNote)}>
                <StickyNote className="h-4 w-4" /> Add note
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <p className="flex items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                <BellRing className="h-3 w-3" /> Remind me
              </p>
              {REVISIT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  role="menuitem"
                  className={cn(item, "py-1.5 pl-9")}
                  onClick={run(() =>
                    change({ revisitAt: p.at().toISOString() })
                  )}
                >
                  {p.label}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                role="menuitem"
                className={cn(
                  item,
                  "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                )}
                onClick={run(() => scheduleDelete([bookmark.id]))}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
