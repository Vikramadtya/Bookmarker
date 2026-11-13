import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_COLORS } from "@/lib/viewDefs";
import { useTags } from "@/domains/bookmarks/application/useBookmarks";
import {
  useDeleteTag,
  useRenameTag,
  useTagColor,
} from "@/domains/organize/application/useOrganize";
import { useNav } from "@/domains/organize/application/useNav";
import { useAppStore } from "@/store/useAppStore";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";

/** Turns "dev/rust" style names into a tree; a parent counts everything below it. */
function buildTree(tags) {
  const root = { children: new Map() };
  for (const { tag, count, color } of tags) {
    let node = root;
    let path = "";
    for (const part of tag.split("/")) {
      path = path ? `${path}/${part}` : part;
      if (!node.children.has(part))
        node.children.set(part, {
          name: part,
          path,
          own: 0,
          color: null,
          children: new Map(),
        });
      node = node.children.get(part);
    }
    node.own = count;
    node.color = color;
  }
  const total = (n) =>
    n.own + [...n.children.values()].reduce((s, c) => s + total(c), 0);
  const finish = (n) => ({
    ...n,
    total: total(n),
    children: [...n.children.values()]
      .map(finish)
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
  return finish(root).children;
}

function TagRow({ node, depth, existing, onBrowse }) {
  const [open, setOpen] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.path);
  const [coloring, setColoring] = useState(false);
  const rename = useRenameTag();
  const setColor = useTagColor();
  const remove = useDeleteTag();

  const willMerge = name !== node.path && existing.has(name);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || name === node.path) return setRenaming(false);
    rename.mutate(
      { from: node.path, to: name.trim() },
      { onSuccess: () => setRenaming(false) }
    );
  };

  return (
    <li>
      <div
        className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Collapse" : "Expand"}
          className={cn(
            "rounded p-0.5 text-slate-400",
            node.children.length === 0 && "invisible"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-90"
            )}
          />
        </button>

        <div className="relative">
          <button
            onClick={() => setColoring(!coloring)}
            aria-label="Choose color"
            className="h-3 w-3 rounded-full ring-2 ring-transparent hover:ring-slate-300"
            style={{ background: node.color ?? "var(--color-slate-300)" }}
          />
          {coloring && (
            <div className="animate-pop shadow-lift absolute top-5 left-0 z-20 flex w-40 flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor.mutate({ tag: node.path, color: c });
                    setColoring(false);
                  }}
                  className="h-5 w-5 rounded-full"
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <button
                onClick={() => {
                  setColor.mutate({ tag: node.path, color: null });
                  setColoring(false);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-400"
                aria-label="No color"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {renaming ? (
          <form onSubmit={submit} className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
              maxLength={50}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-2 py-0.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600"
            />
            {willMerge && (
              <span className="text-[11px] font-medium text-amber-600">
                merges into existing
              </span>
            )}
            <button className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              Save
            </button>
          </form>
        ) : (
          <button
            onClick={() => onBrowse(node.path)}
            className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-blue-600 dark:text-slate-200"
          >
            {node.name}
          </button>
        )}

        {!renaming && (
          <>
            <span className="rounded-full bg-slate-200/70 px-1.5 py-px text-[10px] font-semibold text-slate-500 tabular-nums dark:bg-slate-800">
              {node.total}
            </span>
            <div className="hidden items-center group-hover:flex">
              <button
                onClick={() => setRenaming(true)}
                aria-label="Rename or merge"
                className="rounded p-1 text-slate-400 hover:text-blue-500"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() =>
                  window.confirm(
                    `Remove the tag "${node.path}" from every bookmark?`
                  ) && remove.mutate(node.path)
                }
                aria-label="Delete tag"
                className="rounded p-1 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TagRow
              key={child.path}
              node={child}
              depth={depth + 1}
              existing={existing}
              onBrowse={onBrowse}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const { goFolder } = useNav();
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [filter, setFilter] = useState("");

  const shown = useMemo(
    () =>
      tags.filter((t) => t.tag.toLowerCase().includes(filter.toLowerCase())),
    [tags, filter]
  );
  const tree = useMemo(() => buildTree(shown), [shown]);
  const existing = useMemo(() => new Set(tags.map((t) => t.tag)), [tags]);

  const browse = (path) => {
    setSearchQuery(`tag:${path.includes(" ") ? `"${path}"` : path}`);
    goFolder("root");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          Tags
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Click a tag to browse it. Use{" "}
          <code className="text-xs">parent/child</code> names to nest tags;
          renaming a parent moves its children, and renaming onto an existing
          tag merges them.
        </p>
        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState
            title="No tags yet"
            description="Add tags when you save or edit a bookmark, or accept the suggestions."
          />
        ) : (
          <ul>
            {tree.map((node) => (
              <TagRow
                key={node.path}
                node={node}
                depth={0}
                existing={existing}
                onBrowse={browse}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
