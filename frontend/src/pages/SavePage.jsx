import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/domains/identity/application/useAuth";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useCreateBookmark } from "@/domains/bookmarks/application/useBookmarks";
import { useExistingBookmark } from "@/domains/organize/application/useOrganize";
import { AUTH_URL } from "@/lib/metadata";

const PENDING_KEY = "pending-save";
const URL_IN_TEXT = /https?:\/\/[^\s]+/i;

function readTarget() {
  const params = new URLSearchParams(window.location.search);
  // Share sheets often put the link in `text` instead of `url`.
  const url =
    params.get("url") || params.get("text")?.match(URL_IN_TEXT)?.[0] || "";
  if (url) return { url, title: params.get("title") || "" };
  try {
    return (
      JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null") ?? {
        url: "",
        title: "",
      }
    );
  } catch {
    return { url: "", title: "" };
  }
}

/**
 * Landing page for the bookmarklet and the phone share menu: saves one link to
 * the Inbox and gets out of the way.
 */
export default function SavePage() {
  const { data: user, isLoading } = useAuth();
  const { data: folders = [] } = useFolders();
  const create = useCreateBookmark();
  const [target] = useState(readTarget);
  const { data: existing } = useExistingBookmark(user ? target.url : "");
  const started = useRef(false);

  const inbox = folders.find((f) => f.isInbox);
  const isDuplicate = existing?.exists;

  // Signed-out visitors keep the link while they sign in.
  useEffect(() => {
    if (!isLoading && !user && target.url) {
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(target));
      } catch {
        /* the link just won't survive sign-in */
      }
    }
  }, [isLoading, user, target]);

  useEffect(() => {
    if (
      !user ||
      !inbox ||
      !target.url ||
      existing === undefined ||
      isDuplicate ||
      started.current
    )
      return;
    started.current = true;
    create.mutate(
      {
        bookmarkURL: target.url,
        title: target.title.slice(0, 500),
        folderId: inbox.id,
      },
      {
        onSuccess: () => {
          sessionStorage.removeItem(PENDING_KEY);
          // Opened by the bookmarklet as a small window: close it when done.
          if (window.opener) setTimeout(() => window.close(), 1400);
        },
      }
    );
  }, [user, inbox, target, existing, isDuplicate, create]);

  let content;
  if (!target.url) {
    content = (
      <p className="text-sm text-slate-500">
        Nothing to save. Open this from the bookmarklet or your share menu.
      </p>
    );
  } else if (isLoading) {
    content = <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
  } else if (!user) {
    content = (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sign in to save this link.
        </p>
        <a
          href={`${AUTH_URL}/google`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Sign in with Google
        </a>
      </>
    );
  } else if (isDuplicate) {
    content = (
      <p className="text-sm text-amber-700 dark:text-amber-300">
        You already saved this page.
      </p>
    );
  } else if (create.isSuccess) {
    content = (
      <>
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">
          Saved to your Inbox
        </p>
      </>
    );
  } else if (create.isError) {
    content = <p className="text-sm text-red-600">Could not save this link.</p>;
  } else {
    content = <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
      <div className="shadow-lift w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center">{content}</div>
        {target.url && (
          <p
            className="mt-4 truncate text-xs text-slate-400"
            title={target.url}
          >
            {target.title || target.url}
          </p>
        )}
        {(create.isSuccess || isDuplicate) && (
          <a
            href="/"
            className="mt-5 inline-block text-xs font-medium text-blue-600 hover:underline"
          >
            Open Bookmarker
          </a>
        )}
      </div>
    </div>
  );
}
