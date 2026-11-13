import { Bookmark, Download, Keyboard, Plus, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function Step({ icon: Icon, title, description, action, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className="group shadow-soft hover:shadow-lift flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
    >
      <span
        className={
          primary
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
        <span className="mt-1.5 block text-xs font-medium text-blue-600 dark:text-blue-400">
          {action} →
        </span>
      </span>
    </button>
  );
}

/** Shown to an account with nothing saved yet. */
export default function Onboarding() {
  const openBookmarkModal = useAppStore((s) => s.openBookmarkModal);
  const openSettings = useAppStore((s) => s.openSettings);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);

  return (
    <div className="animate-fade-up space-y-3 py-4">
      <div className="mb-5 text-center">
        <div className="shadow-lift mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Bookmark className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Welcome to Bookmarker
        </h3>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
          Save links now, sort them later. Everything you save lands in your
          Inbox as unread.
        </p>
      </div>
      <Step
        primary
        icon={Plus}
        title="Save your first link"
        description="Paste a URL. The title, preview and tag suggestions fill in on their own."
        action="Add a bookmark"
        onClick={() => openBookmarkModal("add")}
      />
      <Step
        icon={Download}
        title="Bring your bookmarks with you"
        description="Import from your browser, Raindrop, Pinboard or Pocket."
        action="Import"
        onClick={() => openSettings("data")}
      />
      <Step
        icon={Zap}
        title="Save from anywhere"
        description="Get the bookmarklet, the browser extension, or email links to yourself."
        action="Set up capture"
        onClick={() => openSettings("capture")}
      />
      <Step
        icon={Keyboard}
        title="Learn the shortcuts"
        description="Triage a pile of links in minutes with A, R, S and M."
        action="Show shortcuts"
        onClick={() => setShortcutsOpen(true)}
      />
    </div>
  );
}
