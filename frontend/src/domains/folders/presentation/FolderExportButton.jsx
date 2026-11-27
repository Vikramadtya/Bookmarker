import { useState } from "react";
import { Download } from "lucide-react";
import { useFolders } from "@/domains/folders/application/useFolders";
import { useExportData } from "@/domains/identity/application/useSettings";
import { selectedFolderId } from "@/lib/folderTree";

/** Export for the folder being viewed. Works by touch, unlike the right-click menu. */
export default function FolderExportButton({ selection }) {
  const [open, setOpen] = useState(false);
  const { data: folders = [] } = useFolders();
  const exportData = useExportData();
  const folder = folders.find((f) => f.id === selectedFolderId(selection));
  if (!folder) return null; // "All", favorites and smart views are not folders

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Export ${folder.name}`}
        title="Export this folder"
        disabled={exportData.isPending}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Download className="h-4 w-4 stroke-[1.5]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="animate-pop shadow-lift absolute top-10 right-0 z-30 w-52 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="px-3 py-1.5 text-[11px] text-slate-400">
              This folder and its subfolders
            </p>
            {["csv", "json"].map((format) => (
              <button
                key={format}
                role="menuitem"
                onClick={() => {
                  exportData.mutate({ format, folder });
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Export as {format.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
