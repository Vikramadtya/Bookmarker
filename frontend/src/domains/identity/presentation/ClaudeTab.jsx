import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useClaudeActions,
  useClaudeSession,
} from "@/domains/organize/application/useClaude";

const card = "rounded-xl border border-slate-200 p-4 dark:border-slate-800";
const primary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50";
const secondary =
  "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

/** Start a one-time session, connect Claude to it, then review what it suggests. */
export default function ClaudeTab() {
  const { data } = useClaudeSession();
  const { start, end } = useClaudeActions();
  const [includeNotes, setIncludeNotes] = useState(false);
  if (!data) return null;
  const { session, connectorUrl } = data;
  const open = session?.status === "open";
  const suggestions = session
    ? session.counts.pending + session.counts.applied
    : 0;

  const copy = () =>
    navigator.clipboard
      .writeText(connectorUrl)
      .then(() => toast.success("Address copied"));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-medium text-slate-900 dark:text-white">
          <Bot className="h-5 w-5 text-blue-600" /> Organise with Claude
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect your own Claude for one pass over your library. It suggests
          tags, descriptions and folders, and you decide what to apply.
        </p>
      </div>

      {suggestions > 0 && (
        <div
          className={`${card} flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/5`}
        >
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {session.counts.pending} suggestion
            {session.counts.pending === 1 ? "" : "s"} waiting
            {session.counts.applied > 0 &&
              ` · ${session.counts.applied} applied`}
          </p>
          <Link to="/review" className={primary}>
            Review
          </Link>
        </div>
      )}

      <div className={card}>
        <h4 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> What Claude can
          do
        </h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-500 dark:text-slate-400">
          <li>
            Read titles, web addresses (without query strings), tags, folders
            and descriptions. These are sent to Claude.
          </li>
          <li>Suggest changes. It cannot change, delete or share anything.</li>
          <li>Never see locked or hidden folders.</li>
          <li>Access ends after one hour, or sooner if you end it.</li>
        </ul>
      </div>

      {open ? (
        <div className={card}>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <span
              className={`h-2 w-2 rounded-full ${session.connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`}
            />
            {session.connected
              ? "Claude is connected"
              : "Waiting for Claude to connect"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Access ends at{" "}
            {new Date(session.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {session.includeNotes && " · notes and highlights included"}
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              In Claude, open Settings → Connectors and add a custom connector
              with this address:
              <span className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                  {connectorUrl}
                </code>
                <button
                  onClick={copy}
                  aria-label="Copy address"
                  className={secondary}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
            <li>
              Press Connect, then Allow on the Bookmarker page that opens.
            </li>
            <li>
              Ask Claude: “Organise my Bookmarker library.” If the connector is
              already added, reconnect it for this session.
            </li>
          </ol>
          <button
            onClick={() => end.mutate(session.id)}
            className={`${secondary} mt-4`}
          >
            End access now
          </button>
        </div>
      ) : (
        <div className={card}>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
            />
            Also share my notes and highlights
          </label>
          <button
            onClick={() => start.mutate(includeNotes)}
            disabled={start.isPending}
            className={`${primary} mt-3`}
          >
            Start a one-hour session
          </button>
          {session && suggestions === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              The last session ended with nothing to review.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
