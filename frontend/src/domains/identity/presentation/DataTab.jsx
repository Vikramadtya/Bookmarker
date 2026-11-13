import React from "react";
import { Download, Upload } from "lucide-react";

export default function DataTab({
  exportData,
  importData,
  fileInputRef,
  handleImportClick,
  handleFileChange,
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Data Management
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Move your bookmarks in or out. Import understands browser exports
          (HTML), Raindrop, Pinboard and Pocket (HTML, JSON or CSV); the file
          type is detected for you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              Export Bookmarks
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Download everything with your folders, tags and read status.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {["html", "json", "csv"].map((format) => (
              <button
                key={format}
                onClick={() => exportData.mutate(format)}
                disabled={exportData.isPending}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              Import Bookmarks
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload an export from your browser, Raindrop, Pinboard or Pocket.
              Imported links count as already read, and links you saved before
              are skipped.
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".html,.htm,.json,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={handleImportClick}
              disabled={importData.isPending}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              {importData.isPending ? "Importing..." : "Import file"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
