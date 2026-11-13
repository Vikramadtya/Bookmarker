import { useState } from "react";
import { Copy, Merge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDuplicateGroups,
  useMergeBookmarks,
} from "@/domains/organize/application/useOrganize";
import { useFolders } from "@/domains/folders/application/useFolders";
import { Favicon } from "@/shared/ui/Favicon";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  displayTitle,
  hostnameOf,
  timeAgo,
} from "@/domains/bookmarks/presentation/bookmarkText";

function Group({ group, folderName }) {
  // Keep the oldest by default: it has the longest history.
  const [keepId, setKeepId] = useState(group[0].id);
  const merge = useMergeBookmarks();

  return (
    <li className="shadow-soft rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-xs text-slate-500">
          {hostnameOf(group[0].bookmarkURL)}
        </p>
        <button
          disabled={merge.isPending}
          onClick={() =>
            merge.mutate({
              keepId,
              mergeIds: group.filter((b) => b.id !== keepId).map((b) => b.id),
            })
          }
          className="shadow-soft flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <Merge className="h-3.5 w-3.5" /> Merge {group.length} into one
        </button>
      </div>
      <ul className="space-y-1.5">
        {group.map((b) => (
          <li key={b.id}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors",
                keepId === b.id
                  ? "border-blue-300 bg-blue-50/60 dark:border-blue-500/40 dark:bg-blue-500/10"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              )}
            >
              <input
                type="radio"
                name={group[0].id}
                checked={keepId === b.id}
                onChange={() => setKeepId(b.id)}
                className="accent-blue-600"
              />
              <Favicon src={b.logoURL} className="h-7 w-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {displayTitle(b)}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {folderName(b.folderId)} · saved {timeAgo(b.creationDate)}
                  {b.tags.length > 0 &&
                    ` · ${b.tags.length} tag${b.tags.length === 1 ? "" : "s"}`}
                  {b.comments.length > 0 && " · has notes"}
                </p>
              </div>
              {keepId === b.id && (
                <span className="text-[11px] font-semibold text-blue-600">
                  Keep
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">
        Tags, notes, highlights and favorites from the others are carried over.
      </p>
    </li>
  );
}

export default function DuplicatesView() {
  const { data: groups = [], isLoading } = useDuplicateGroups();
  const { data: folders = [] } = useFolders();
  const merge = useMergeBookmarks();
  const names = new Map(folders.map((f) => [f.id, f.name]));
  const folderName = (id) => names.get(id) ?? "Unknown folder";

  const mergeAll = async () => {
    for (const group of groups) {
      await merge.mutateAsync({
        keepId: group[0].id,
        mergeIds: group.slice(1).map((b) => b.id),
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Duplicates
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The same page saved more than once, ignoring tracking parameters,{" "}
              <code className="text-xs">www</code> and trailing slashes.
            </p>
          </div>
          {groups.length > 1 && (
            <button
              onClick={mergeAll}
              disabled={merge.isPending}
              className="shadow-soft shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Merge all, keep oldest
            </button>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No duplicates"
            description="Nice and tidy. If the same page is saved twice it will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <Group
                key={group.map((b) => b.id).join()}
                group={group}
                folderName={folderName}
              />
            ))}
          </ul>
        )}
        {groups.length > 0 && <Copy className="sr-only" aria-hidden="true" />}
      </div>
    </div>
  );
}
