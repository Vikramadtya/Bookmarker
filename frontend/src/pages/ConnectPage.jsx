import { useEffect } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useAuth } from "@/domains/identity/application/useAuth";
import {
  useClaudeActions,
  useConnectDecision,
  useConnectRequest,
} from "@/domains/organize/application/useClaude";
import { AUTH_URL } from "@/lib/metadata";

const KEY = "pending-connect";
const primary =
  "w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50";
const secondary =
  "w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

const readKey = () =>
  new URLSearchParams(window.location.search).get("request") ||
  sessionStorage.getItem(KEY) ||
  "";

/** The approval screen Claude sends the user to. */
export default function ConnectPage() {
  const key = readKey();
  const { data: user, isLoading } = useAuth();
  const request = useConnectRequest(key, !!user);
  const decide = useConnectDecision(key);
  const { start } = useClaudeActions();

  // Keep the request while a signed-out visitor signs in.
  useEffect(() => {
    if (!isLoading && !user && key) sessionStorage.setItem(KEY, key);
    if (request.isError) sessionStorage.removeItem(KEY);
  }, [isLoading, user, key, request.isError]);

  let content;
  if (!key || request.isError) {
    content = (
      <p className="text-sm text-slate-500">
        This request has expired. Go back to Claude and connect again.
      </p>
    );
  } else if (isLoading || (user && !request.data)) {
    content = (
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
    );
  } else if (!user) {
    content = (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sign in to connect Claude to your library.
        </p>
        <a href={`${AUTH_URL}/google`} className={`${primary} mt-4 block`}>
          Sign in with Google
        </a>
      </>
    );
  } else {
    const { clientName, returnsTo, session } = request.data;
    content = (
      <>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Link {clientName} to your bookmarks?
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Signed in as {user.email}. You will be returned to {returnsTo}.
        </p>
        <ul className="mt-4 space-y-1 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <li>✓ Read bookmarks, only while you have a session open</li>
          <li>✓ Never see locked or hidden folders</li>
          <li>✓ Suggest changes for you to review</li>
          <li>✗ Change, delete or share anything</li>
        </ul>
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          The link lasts 90 days or until you disconnect. Only allow this if you
          just pressed Connect in Claude yourself.
        </p>
        {session ? (
          <button
            onClick={() => decide.mutate(true)}
            disabled={decide.isPending || decide.isSuccess}
            className={`${primary} mt-4`}
          >
            Allow
            {session.includeNotes ? " (with notes and highlights)" : ""}
          </button>
        ) : (
          <button
            onClick={() =>
              start.mutate(false, { onSuccess: () => request.refetch() })
            }
            disabled={start.isPending}
            className={`${primary} mt-4`}
          >
            Start a one-hour session first
          </button>
        )}
        <button
          onClick={() => decide.mutate(false)}
          className={`${secondary} mt-2`}
        >
          Cancel
        </button>
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="shadow-lift w-full max-w-sm rounded-2xl bg-white p-6 text-center dark:bg-slate-900">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
          <Bot className="h-5 w-5" />
        </span>
        {content}
      </div>
    </div>
  );
}
