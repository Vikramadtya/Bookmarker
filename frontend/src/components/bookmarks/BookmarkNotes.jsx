import React, { useState } from "react";
import { MessageSquare, Loader2, Plus } from "lucide-react";

export default function BookmarkNotes({
  bookmark,
  setSelectedBookmark,
  updateBookmark,
}) {
  const [newNote, setNewNote] = useState("");

  return (
    <div className="mb-6 space-y-3">
      <div className="mb-2 flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Notes
        </h3>
      </div>

      {bookmark.comments?.length > 0 && (
        <div className="mb-3 space-y-2">
          {bookmark.comments.map((comment, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {comment}
              </p>
            </div>
          ))}
        </div>
      )}

      <form
        className="relative flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newNote.trim()) return;

          const updatedComments = [
            ...(bookmark.comments || []),
            newNote.trim(),
          ];

          // Optimistically update local view
          setSelectedBookmark({ ...bookmark, comments: updatedComments });

          updateBookmark.mutate(
            {
              id: bookmark.id,
              data: { comments: updatedComments },
            },
            {
              onSuccess: () => setNewNote(""),
            }
          );
        }}
      >
        <input
          type="text"
          placeholder="Add a new note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          disabled={updateBookmark.isPending}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={!newNote.trim() || updateBookmark.isPending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {updateBookmark.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
