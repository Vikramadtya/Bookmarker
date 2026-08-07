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
          Export or import your bookmarks using the universal Netscape HTML
          format.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              Export Bookmarks
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Download all your folders and bookmarks as an HTML file.
            </p>
          </div>
          <button
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportData.isPending ? "Exporting..." : "Export HTML"}
          </button>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              Import Bookmarks
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload a Netscape Bookmark HTML file to add to your collection.
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".html,.htm"
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
              {importData.isPending ? "Importing..." : "Import HTML"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
