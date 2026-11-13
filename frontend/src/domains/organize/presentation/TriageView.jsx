import { useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Archive,
  CheckCheck,
  ExternalLink,
  Folder,
  Moon,
  PartyPopper,
  SkipForward,
  Star,
  Tag,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBookmarks,
  useUpdateBookmark,
} from "@/domains/bookmarks/application/useBookmarks";
import {
  useCounts,
  useRecordOpen,
} from "@/domains/organize/application/useOrganize";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useNav } from "@/domains/organize/application/useNav";
import { Thumbnail } from "@/shared/ui/Thumbnail";
import { Favicon } from "@/shared/ui/Favicon";
import { Skeleton } from "@/shared/ui/Skeleton";
import {
  displayTitle,
  hostnameOf,
  isPending,
  timeAgo,
} from "@/domains/bookmarks/presentation/bookmarkText";
import Suggestions from "./Suggestions";

const SNOOZE_DAYS = 7;
const ACTIONS = [
  {
    key: "a",
    label: "Archive",
    icon: Archive,
    tone: "hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10",
  },
  {
    key: "r",
    label: "Mark read",
    icon: CheckCheck,
    tone: "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10",
  },
  {
    key: "s",
    label: "Snooze",
    icon: Moon,
    tone: "hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10",
  },
  {
    key: "m",
    label: "Move",
    icon: Folder,
    tone: "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10",
  },
  {
    key: "t",
    label: "Tag",
    icon: Tag,
    tone: "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10",
  },
];

function MovePicker({ folders, onPick, onClose }) {
  const [filter, setFilter] = useState("");
  const options = folders
    .filter(
      (f) => !f.isLocked && f.name.toLowerCase().includes(filter.toLowerCase())
    )
    .slice(0, 8);
  return (
    <div className="animate-pop shadow-lift absolute right-0 bottom-full left-0 z-20 mb-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <input
        autoFocus
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && options[0]) onPick(options[0]);
        }}
        placeholder="Move to… (Enter picks the first)"
        className="mb-1.5 w-full rounded-lg border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
      />
      <div className="max-h-48 overflow-y-auto">
        {options.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Folder className="h-3.5 w-3.5 text-slate-400" />
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TagPrompt({ onAdd, onClose }) {
  const [value, setValue] = useState("");
  return (
    <div className="animate-pop shadow-lift absolute right-0 bottom-full left-0 z-20 mb-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
        placeholder="Add a tag, e.g. dev/rust (Enter to add)"
        className="w-full rounded-lg border border-slate-200 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
      />
    </div>
  );
}

/** Works through unread bookmarks one at a time, like triaging an inbox. */
export default function TriageView() {
  const { goPage } = useNav();
  const { data: counts } = useCounts();
  const { data: folders = [] } = useFolders();
  const { mutate: update } = useUpdateBookmark();
  const recordOpen = useRecordOpen();
  const {
    data: loaded = [],
    isLoading,
    hasNextPage,
    fetchNextPage,
  } = useBookmarks({ triage: true, sort: "oldest", folderId: "root" });

  const [handled, setHandled] = useState(() => new Set());
  const [mode, setMode] = useState(null); // 'move' | 'tag' | null
  const history = useRef([]); // for undo

  const queue = useMemo(
    () => loaded.filter((b) => !handled.has(b.id)),
    [loaded, handled]
  );
  // The card on screen stays put even if opening it changes its status.
  const [pinnedId, setPinnedId] = useState(null);
  const current = queue.find((b) => b.id === pinnedId) ?? queue[0];

  const advance = (id) => {
    setHandled((s) => new Set(s).add(id));
    setPinnedId(null);
    setMode(null);
    if (queue.length < 4 && hasNextPage) fetchNextPage();
  };

  const act = (patch, inverse) => {
    if (!current) return;
    history.current.push({ id: current.id, inverse });
    update({ id: current.id, data: patch });
    advance(current.id);
  };

  const archive = () => act({ status: "archived" }, { status: "unread" });
  const markRead = () => act({ status: "done" }, { status: "unread" });
  const snooze = () =>
    act(
      {
        snoozedUntil: new Date(
          Date.now() + SNOOZE_DAYS * 86_400_000
        ).toISOString(),
      },
      { snoozedUntil: null }
    );
  const moveTo = (folder) =>
    act(
      { folderId: folder.id, status: "done" },
      { folderId: current.folderId, status: "unread" }
    );
  const addTag = (tag) => {
    if (!current || current.tags.includes(tag)) return;
    update({ id: current.id, data: { tags: [...current.tags, tag] } });
  };
  const skip = () => current && advance(current.id);
  const favorite = () =>
    current &&
    update({ id: current.id, data: { isFavorite: !current.isFavorite } });
  const open = () => {
    if (!current) return;
    window.open(current.bookmarkURL, "_blank", "noopener");
    recordOpen.mutate(current.id);
    setPinnedId(current.id);
  };
  const undo = () => {
    const last = history.current.pop();
    if (!last) return;
    update({ id: last.id, data: last.inverse });
    setHandled((s) => {
      const next = new Set(s);
      next.delete(last.id);
      return next;
    });
    setPinnedId(last.id);
  };

  const deps = [current, queue.length, mode];
  useHotkeys("a", archive, { preventDefault: true }, deps);
  useHotkeys("r", markRead, { preventDefault: true }, deps);
  useHotkeys("s", snooze, { preventDefault: true }, deps);
  useHotkeys("m", () => setMode("move"), { preventDefault: true }, deps);
  useHotkeys("t", () => setMode("tag"), { preventDefault: true }, deps);
  useHotkeys("o", open, { preventDefault: true }, deps);
  useHotkeys("f", favorite, { preventDefault: true }, deps);
  useHotkeys("right, space", skip, { preventDefault: true }, deps);
  useHotkeys("u", undo, { preventDefault: true }, deps);
  useHotkeys("escape", () => (mode ? setMode(null) : goPage(null)), deps);

  const remaining = Math.max(
    0,
    (counts?.unread ?? queue.length) - handled.size
  );
  const handlers = {
    a: archive,
    r: markRead,
    s: snooze,
    m: () => setMode("move"),
    t: () => setMode("tag"),
  };

  return (
    <div className="flex h-full flex-1 flex-col items-center overflow-y-auto bg-slate-50/60 px-4 py-6 dark:bg-slate-950">
      <div className="mb-5 flex w-full max-w-xl items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Triage
          </h2>
          <p className="text-xs text-slate-500">
            {isLoading ? "Loading…" : `${remaining} unread to go`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            className="shadow-soft flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            disabled={history.current.length === 0}
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            onClick={() => goPage(null)}
            aria-label="Leave triage"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mt-5 h-6 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
      ) : !current ? (
        <div className="animate-fade-up mt-16 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Inbox zero
          </h3>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Nothing left to triage. New saves will show up here as they arrive.
          </p>
          <button
            onClick={() => goPage(null)}
            className="shadow-soft mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Back to your library
          </button>
        </div>
      ) : (
        <div
          key={current.id}
          className="animate-fade-up relative w-full max-w-xl"
        >
          <article className="shadow-lift overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Thumbnail
              bookmark={current}
              pending={isPending(current)}
              className="aspect-video w-full"
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Favicon
                  src={current.logoURL}
                  className="h-5 w-5 rounded p-0.5"
                  iconClassName="h-3 w-3"
                />
                <span className="truncate">
                  {hostnameOf(current.bookmarkURL)}
                </span>
                <span className="text-slate-300">·</span>
                <span>saved {timeAgo(current.creationDate)}</span>
              </div>
              <h3 className="text-xl leading-snug font-bold tracking-tight text-slate-900 dark:text-white">
                {displayTitle(current)}
              </h3>
              {(current.summary || current.description) && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {current.summary || current.description}
                </p>
              )}
              {current.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {current.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <Suggestions bookmark={current} />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={open}
                  className="shadow-soft flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <ExternalLink className="h-4 w-4" /> Open{" "}
                  <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px]">
                    O
                  </kbd>
                </button>
                <button
                  onClick={favorite}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
                    current.isFavorite
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  )}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      current.isFavorite && "fill-current"
                    )}
                  />{" "}
                  Favorite
                </button>
                <button
                  onClick={skip}
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Skip <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>

          <div className="relative mt-4">
            {mode === "move" && (
              <MovePicker
                folders={folders}
                onPick={moveTo}
                onClose={() => setMode(null)}
              />
            )}
            {mode === "tag" && (
              <TagPrompt onAdd={addTag} onClose={() => setMode(null)} />
            )}
            <div className="grid grid-cols-5 gap-2">
              {ACTIONS.map(({ key, label, icon: Icon, tone }) => (
                <button
                  key={key}
                  onClick={handlers[key]}
                  className={cn(
                    "shadow-soft flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-medium text-slate-600 transition-all active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
                    tone
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <kbd className="rounded border border-slate-200 px-1 text-[10px] text-slate-400 uppercase dark:border-slate-700">
                    {key}
                  </kbd>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Snooze hides it for {SNOOZE_DAYS} days · <kbd>U</kbd> undoes ·{" "}
              <kbd>→</kbd> skips · <kbd>Esc</kbd> leaves
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
