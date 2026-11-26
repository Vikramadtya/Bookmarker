import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ImageOff, Loader2, MonitorOff } from "lucide-react";
import { makeApiRequest } from "@/lib/api";
import { BASE_URL } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { hostnameOf } from "./bookmarkText";

const TABS = [
  ["screenshot", "Screenshot"],
  ["preview", "Interactive Preview"],
];

const screenshotUrl = (url) =>
  `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

function Notice({ icon: Icon, title, children, url }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center dark:bg-slate-900">
      <Icon className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="max-w-sm text-xs text-slate-500">{children}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        Open the page <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

/** A screenshot from a screenshot service, else the page's own preview image. */
function Screenshot({ bookmark }) {
  const [stage, setStage] = useState("shot"); // shot | image | none
  const [loading, setLoading] = useState(true);
  const url = bookmark.bookmarkURL;
  const fail = () => {
    setStage(stage === "shot" && bookmark.imageURL ? "image" : "none");
    setLoading(true);
  };

  if (stage === "none")
    return (
      <Notice icon={ImageOff} title="No screenshot available" url={url}>
        The free screenshot service only allows a few a day, and this page has
        no preview image of its own.
      </Notice>
    );

  return (
    <div className="relative h-full min-h-64">
      {loading && (
        <Loader2 className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      )}
      <img
        key={stage}
        src={stage === "shot" ? screenshotUrl(url) : bookmark.imageURL}
        alt="Website preview"
        referrerPolicy="no-referrer"
        onLoad={() => setLoading(false)}
        onError={fail}
        className={cn(
          "h-full w-full",
          stage === "shot" ? "object-cover object-top" : "object-contain"
        )}
      />
      {stage === "image" && !loading && (
        <p className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-3 py-2 text-center text-xs text-white">
          Showing the page’s preview image. A live screenshot isn’t available
          right now (the free service has a daily limit).
        </p>
      )}
    </div>
  );
}

/** The live page in a frame, when the site permits it. */
function LivePage({ bookmark }) {
  const url = bookmark.bookmarkURL;
  const { data, isLoading } = useQuery({
    queryKey: ["embeddable", bookmark.id, url],
    staleTime: 24 * 60 * 60_000,
    retry: false,
    queryFn: () =>
      makeApiRequest({
        url: `${BASE_URL}/bookmarks/${bookmark.id}/preview`,
        meta: { silent: true },
      }),
  });

  if (isLoading)
    return (
      <div className="flex h-full min-h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );

  if (data?.embeddable === false)
    return (
      <Notice
        icon={MonitorOff}
        title={`${hostnameOf(url)} can’t be shown here`}
        url={url}
      >
        This site doesn’t allow other apps to display its pages, and browsers
        enforce that.
      </Notice>
    );

  return (
    <iframe
      src={url}
      title="Preview"
      referrerPolicy="no-referrer"
      // No top-level navigation: a framed page cannot take over the app.
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      className="h-full min-h-96 w-full border-0"
    />
  );
}

export default function BookmarkPreview({ bookmark }) {
  const [viewMode, setViewMode] = useState("screenshot");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex gap-4 border-b border-slate-200 text-sm dark:border-slate-800">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={cn(
              "px-2 pb-2 font-medium transition-colors",
              viewMode === id
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="shadow-soft flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {viewMode === "screenshot" ? (
          <Screenshot bookmark={bookmark} />
        ) : (
          <LivePage bookmark={bookmark} />
        )}
      </div>
    </div>
  );
}
