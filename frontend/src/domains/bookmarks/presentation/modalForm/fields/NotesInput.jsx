import React, { useState } from "react";
import { MessageSquare, Trash2, Plus } from "lucide-react";

export default function NotesInput({
  currentComments,
  setValue,
  isSubmitting,
}) {
  const [newComment, setNewComment] = useState("");

  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <MessageSquare className="h-4 w-4 text-slate-400" /> Notes{" "}
        <span className="text-xs font-normal text-slate-400">(Optional)</span>
      </label>

      <div className="mb-3 space-y-3">
        {currentComments.map((comment, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">
              {comment}
            </p>
            <button
              type="button"
              onClick={() =>
                setValue(
                  "comments",
                  currentComments.filter((_, i) => i !== index)
                )
              }
              className="p-1 text-slate-400 transition-colors hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Add a new note..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newComment.trim()) {
                setValue("comments", [...currentComments, newComment.trim()]);
                setNewComment("");
              }
            }
          }}
          disabled={isSubmitting}
        />
        <button
          type="button"
          onClick={() => {
            if (newComment.trim()) {
              setValue("comments", [...currentComments, newComment.trim()]);
              setNewComment("");
            }
          }}
          disabled={!newComment.trim() || isSubmitting}
          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
