import { Folder, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateBookmark } from "@/domains/bookmarks/application/useBookmarks";
import { useFolders } from "@/domains/folders/application/useFolders";

/** One-click chips for the tags and folder the app suggests for a new bookmark. */
export default function Suggestions({ bookmark, className }) {
  const { mutate: update } = useUpdateBookmark();
  const { data: folders = [] } = useFolders();

  const tags = (bookmark.suggestedTags ?? []).filter(
    (t) => !bookmark.tags?.includes(t)
  );
  const folder =
    bookmark.suggestedFolderId &&
    bookmark.suggestedFolderId !== bookmark.folderId
      ? folders.find((f) => f.id === bookmark.suggestedFolderId)
      : null;
  if (tags.length === 0 && !folder) return null;

  const chip =
    "flex items-center gap-1 rounded-full border border-dashed border-blue-300 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-solid hover:bg-blue-100 active:scale-95 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        <Sparkles className="h-3 w-3" />
        Suggested
      </span>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={(e) => {
            e.stopPropagation();
            update({
              id: bookmark.id,
              data: {
                tags: [...(bookmark.tags ?? []), tag],
                suggestedTags: tags.filter((t) => t !== tag),
              },
            });
          }}
          className={chip}
          title="Add this tag"
        >
          <Plus className="h-3 w-3" />
          {tag}
        </button>
      ))}
      {folder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            update({
              id: bookmark.id,
              data: { folderId: folder.id, suggestedFolderId: null },
            });
          }}
          className={chip}
          title="Move to this folder"
        >
          <Folder className="h-3 w-3" />
          Move to {folder.name}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          update({
            id: bookmark.id,
            data: { suggestedTags: [], suggestedFolderId: null },
          });
        }}
        aria-label="Dismiss suggestions"
        className="rounded-full p-1 text-slate-400 hover:text-slate-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
