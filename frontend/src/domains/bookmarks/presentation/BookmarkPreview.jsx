import { useState } from "react";

export default function BookmarkPreview({ url }) {
  const [viewMode, setViewMode] = useState("screenshot");
  const [iframeError, setIframeError] = useState(false);

  const fallbackScreenshot = `https://api.microlink.io/?url=${encodeURIComponent(
    url
  )}&screenshot=true&meta=false&embed=screenshot.url`;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex gap-4 border-b border-slate-200 text-sm">
        <button
          onClick={() => setViewMode("preview")}
          className={`px-2 pb-2 font-medium transition-colors ${
            viewMode === "preview"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Interactive Preview
        </button>
        <button
          onClick={() => setViewMode("screenshot")}
          className={`px-2 pb-2 font-medium transition-colors ${
            viewMode === "screenshot"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Screenshot
        </button>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
        {viewMode === "screenshot" ? (
          <img
            src={fallbackScreenshot}
            alt="Website preview"
            className="h-full w-full object-cover"
            onError={() => setViewMode("preview")}
          />
        ) : !iframeError ? (
          <iframe
            src={url}
            className="h-full w-full border-0"
            title="Preview"
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50">
            <p className="text-sm text-slate-400">Preview not available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
