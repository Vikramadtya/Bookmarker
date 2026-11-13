import { Archive, BookOpen, Mail } from "lucide-react";
import {
  useDigest,
  usePreferences,
  useRecordOpen,
  useUpdatePreferences,
} from "@/domains/organize/application/useOrganize";
import { useUpdateBookmark } from "@/domains/bookmarks/application/useBookmarks";
import { useNav } from "@/domains/organize/application/useNav";
import { Favicon } from "@/shared/ui/Favicon";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  displayTitle,
  timeAgo,
} from "@/domains/bookmarks/presentation/bookmarkText";

const Stat = ({ value, label, onClick }) => (
  <button
    onClick={onClick}
    className="shadow-soft hover:shadow-lift rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
  >
    <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
      {value}
    </p>
    <p className="mt-0.5 text-xs text-slate-500">{label}</p>
  </button>
);

/** The "what did I forget about" page, also sent weekly by email when enabled. */
export default function DigestView() {
  const { data: digest, isLoading } = useDigest();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const { mutate: update } = useUpdateBookmark();
  const recordOpen = useRecordOpen();
  const { goPage, goView } = useNav();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          Your week
        </h2>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          What you saved, what is still waiting, and old links worth another
          look.
        </p>

        {isLoading || !digest ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Stat
                value={digest.savedThisWeek}
                label="saved in the last 7 days"
                onClick={() => goView("builtin:week")}
              />
              <Stat
                value={digest.unread}
                label="unread, waiting for triage"
                onClick={() => goPage("triage")}
              />
            </div>

            <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Still waiting for you
            </h3>
            {digest.resurfaced.length === 0 ? (
              <EmptyState
                title="Nothing is gathering dust"
                description="Unread links older than a month would appear here."
              />
            ) : (
              <ul className="space-y-2">
                {digest.resurfaced.map((b) => (
                  <li
                    key={b.id}
                    className="shadow-soft flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Favicon src={b.logoURL} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {displayTitle(b)}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {b.domain} · saved {timeAgo(b.creationDate)}
                      </p>
                    </div>
                    <a
                      href={b.bookmarkURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordOpen.mutate(b.id)}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Read
                    </a>
                    <button
                      onClick={() =>
                        update({ id: b.id, data: { status: "archived" } })
                      }
                      aria-label="Archive"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Mail className="mt-0.5 h-5 w-5 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Email me this every Monday
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Sent only if email delivery is set up on the server.
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-blue-600"
            checked={Boolean(prefs?.digestEmail)}
            onChange={(e) =>
              updatePrefs.mutate({ digestEmail: e.target.checked })
            }
          />
        </label>
      </div>
    </div>
  );
}
