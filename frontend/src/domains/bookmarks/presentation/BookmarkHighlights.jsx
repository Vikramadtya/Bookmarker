import { Highlighter, Trash2 } from "lucide-react";
import { useHighlights } from "@/domains/organize/application/useOrganize";

/** The passages marked in the reader, with their notes. */
export default function BookmarkHighlights({ bookmark }) {
  const { remove } = useHighlights(bookmark.id);
  const highlights = bookmark.highlights ?? [];
  if (highlights.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        <Highlighter className="h-3 w-3" />
        Highlights ({highlights.length})
      </p>
      <ul className="space-y-2">
        {highlights.map((h) => (
          <li
            key={h.id}
            className="group flex items-start gap-2 rounded-lg border-l-2 border-amber-400 bg-amber-50/60 py-2 pr-2 pl-3 dark:bg-amber-500/5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                “{h.text}”
              </p>
              {h.note && (
                <p className="mt-1 text-xs text-slate-500 italic">{h.note}</p>
              )}
            </div>
            <button
              onClick={() => remove.mutate(h.id)}
              aria-label="Remove highlight"
              className="hidden rounded p-1 text-slate-400 group-hover:block hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
