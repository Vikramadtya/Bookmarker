import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Undo2, X } from "lucide-react";
import { useAuth } from "@/domains/identity/application/useAuth";
import {
  useClaudeActions,
  useClaudeSession,
  useProposals,
} from "@/domains/organize/application/useClaude";
import { hostnameOf } from "@/domains/bookmarks/presentation/bookmarkText";
import { cn } from "@/lib/utils";

const button =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40";
const FILTERS = [
  ["all", "Everything"],
  ["title", "Titles"],
  ["tags", "Tags"],
  ["description", "Descriptions"],
  ["folder", "Folders"],
];
const BATCH = 100;

function Change({ label, from, to }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[6rem_1fr]">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-slate-400 line-through decoration-slate-300">
          {from || "none"}
        </span>
        <ArrowRight className="h-3 w-3 self-center text-slate-400" />
        <span className="text-slate-800 dark:text-slate-100">{to}</span>
      </span>
    </div>
  );
}

/** Before-and-after of every suggestion; nothing changes until it is applied. */
export default function ReviewPage() {
  const { data: user, isLoading } = useAuth();
  const { data } = useClaudeSession();
  const session = data?.session;
  const { data: proposals = [] } = useProposals(user ? session?.id : null);
  const { apply, reject, undo } = useClaudeActions();
  const [filter, setFilter] = useState("all");
  const [unchecked, setUnchecked] = useState(() => new Set());
  const [shown, setShown] = useState(BATCH);

  const pending = useMemo(
    () =>
      proposals.filter(
        (p) => p.status === "pending" && (filter === "all" || p[filter])
      ),
    [proposals, filter]
  );
  if (!isLoading && !user) return <Navigate to="/" replace />;

  const selected = pending.filter((p) => !unchecked.has(p.id)).map((p) => p.id);
  const applied = proposals.filter((p) => p.status === "applied").length;
  const busy = apply.isPending || reject.isPending || undo.isPending;
  const toggle = (id) =>
    setUnchecked((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const allOn = selected.length === pending.length;

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Back"
            className="text-slate-400 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="mr-auto text-base font-semibold text-slate-900 dark:text-white">
            Claude’s suggestions
          </h1>
          {applied > 0 && (
            <button
              onClick={() => undo.mutate(session.id)}
              disabled={busy}
              className={cn(
                button,
                "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Undo2 className="h-4 w-4" /> Undo {applied}
            </button>
          )}
          <button
            onClick={() => reject.mutate({ id: session.id, ids: selected })}
            disabled={busy || selected.length === 0}
            className={cn(
              button,
              "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            )}
          >
            <X className="h-4 w-4" /> Reject
          </button>
          <button
            onClick={() => apply.mutate({ id: session.id, ids: selected })}
            disabled={busy || selected.length === 0}
            className={cn(button, "bg-blue-600 text-white hover:bg-blue-500")}
          >
            <Check className="h-4 w-4" />
            {apply.isPending ? "Applying…" : `Apply ${selected.length}`}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {session?.status === "open" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            Claude can still add suggestions. This list updates when you reload.
          </p>
        )}
        {session?.summary && (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm whitespace-pre-wrap text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {session.summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                filter === id
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 text-slate-500 dark:border-slate-800"
              )}
            >
              {label}
            </button>
          ))}
          {pending.length > 0 && (
            <button
              onClick={() =>
                setUnchecked(new Set(allOn ? pending.map((p) => p.id) : []))
              }
              className="ml-auto text-xs font-medium text-blue-600"
            >
              {allOn ? "Select none" : "Select all"}
            </button>
          )}
        </div>

        {pending.slice(0, shown).map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="checkbox"
              checked={!unchecked.has(p.id)}
              onChange={() => toggle(p.id)}
              className="mt-1"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {p.bookmark.title || p.bookmark.url}
                </p>
                <p className="text-xs text-slate-400">
                  {hostnameOf(p.bookmark.url)}
                </p>
              </div>
              {p.title && (
                <Change label="Title" from={p.bookmark.title} to={p.title} />
              )}
              {p.tags && (
                <Change
                  label="Tags"
                  from={p.bookmark.tags.join(", ")}
                  to={p.tags.join(", ")}
                />
              )}
              {p.folder && (
                <Change label="Folder" from={p.bookmark.folder} to={p.folder} />
              )}
              {p.description && (
                <Change
                  label="Description"
                  from={p.bookmark.description}
                  to={p.description}
                />
              )}
              {p.reason && (
                <p className="text-xs text-slate-400 italic">{p.reason}</p>
              )}
            </div>
          </label>
        ))}
        {pending.length > shown && (
          <button
            onClick={() => setShown((n) => n + BATCH)}
            className="w-full py-2 text-sm font-medium text-blue-600"
          >
            Show more ({pending.length - shown} left)
          </button>
        )}
        {pending.length === 0 && (
          <p className="py-16 text-center text-sm text-slate-500">
            Nothing waiting for review.
          </p>
        )}
      </main>
    </div>
  );
}
