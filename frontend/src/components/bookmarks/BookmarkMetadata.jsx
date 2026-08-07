import React from "react";
import dayjs from "@/lib/dayjs";

export default function BookmarkMetadata({ bookmark }) {
  return (
    <div className="flex flex-wrap gap-8 text-sm">
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          Created
        </p>
        <p className="font-medium text-slate-700 dark:text-slate-200">
          {dayjs(bookmark.creationDate).format("MMM D, YYYY")}
        </p>
      </div>
      {bookmark.tags?.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {bookmark.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
