import {
  Copy,
  KeyRound,
  Mail,
  Smartphone,
  Puzzle,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePreferences,
  useRotateCaptureToken,
} from "@/domains/organize/application/useOrganize";

const card = "rounded-xl border border-slate-200 p-4 dark:border-slate-800";
const heading =
  "flex items-center gap-2 font-medium text-slate-900 dark:text-white";
const hint = "mt-1 text-sm text-slate-500 dark:text-slate-400";

const copy = (text, message = "Copied") =>
  navigator.clipboard.writeText(text).then(() => toast.success(message));

/** Everything about getting links into Bookmarker quickly. */
export default function CaptureTab() {
  const origin = window.location.origin;
  const { data: prefs } = usePreferences();
  const rotate = useRotateCaptureToken();

  const bookmarklet = `javascript:(function(){window.open('${origin}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'bookmarker','width=480,height=640');})();`;
  const webhook = prefs?.captureToken
    ? `${origin}/api/v1/inbound/email?token=${prefs.captureToken}`
    : "";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Save from anywhere
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The faster a link is saved, the more likely you are to keep using
          this.
        </p>
      </div>

      <div className={card}>
        <h4 className={heading}>
          <Bookmark className="h-4 w-4" /> Bookmarklet
        </h4>
        <p className={hint}>
          Drag this to your bookmarks bar, then click it on any page.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <a
            // React blocks javascript: URLs in JSX, so the address is set directly.
            ref={(el) => el?.setAttribute("href", bookmarklet)}
            onClick={(e) => e.preventDefault()}
            draggable
            className="shadow-soft cursor-grab rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
          >
            Save to Bookmarker
          </a>
          <button
            onClick={() => copy(bookmarklet, "Bookmarklet copied")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>

      <div className={card}>
        <h4 className={heading}>
          <Puzzle className="h-4 w-4" /> Browser extension
        </h4>
        <p className={hint}>
          Chrome, Edge, Brave and other Chromium browsers: open{" "}
          <code>chrome://extensions</code>, turn on Developer mode, choose{" "}
          <b>Load unpacked</b> and pick the <code>extension</code> folder from
          the project. Set your app address (<code>{origin}</code>) in its
          options along with the token from the email-to-save address below.
          Safari uses the Xcode project in <code>safari/</code>. Save the
          current tab with the toolbar button or Ctrl/⌘+Shift+S.
        </p>
      </div>

      <div className={card}>
        <h4 className={heading}>
          <Smartphone className="h-4 w-4" /> Phone share menu
        </h4>
        <p className={hint}>
          Install this site as an app (Add to Home Screen). Bookmarker then
          appears in your phone&apos;s Share menu, so you can send any link
          straight to your Inbox.
        </p>
      </div>

      <div className={card}>
        <h4 className={heading}>
          <Mail className="h-4 w-4" /> Email links to yourself
        </h4>
        <p className={hint}>
          Point an inbound-email webhook (Postmark, Mailgun, SendGrid and
          similar) at the address below. Every link in an email it receives
          lands in your Inbox. Treat the address like a password.
        </p>
        {webhook ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={webhook}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              onClick={() => copy(webhook, "Address copied")}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        <button
          onClick={() => rotate.mutate()}
          disabled={rotate.isPending}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {webhook
            ? "Create a new address (the old one stops working)"
            : "Create my address"}
        </button>
      </div>
    </div>
  );
}
