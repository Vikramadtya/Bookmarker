import React from "react";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FolderSelect({
  register,
  errors,
  isSubmitting,
  inbox,
  collections,
  subFolders,
}) {
  return (
    <div>
      <label
        htmlFor="folderId"
        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Folder className="h-4 w-4 text-slate-400" /> Destination Folder{" "}
        <span className="text-red-500">*</span>
      </label>
      <select
        id="folderId"
        className={cn(
          "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900",
          errors.folderId
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700"
        )}
        {...register("folderId")}
        disabled={isSubmitting || (subFolders.length === 0 && !inbox)}
      >
        <option value="" disabled>
          Select a folder
        </option>
        {inbox && (
          <option
            value={inbox.id}
            className="font-semibold text-blue-600 dark:text-blue-400"
          >
            📥 {inbox.name}
          </option>
        )}
        {collections.map((collection) => (
          <optgroup key={collection.id} label={collection.name}>
            <option value={collection.id} className="text-slate-500 italic">
              📁 {collection.name} (Root)
            </option>
            {subFolders
              .filter((f) => f.parentId === collection.id)
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  └ {folder.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {errors.folderId && (
        <p className="mt-1.5 text-[13px] text-red-500">
          {errors.folderId.message}
        </p>
      )}
      {subFolders.length === 0 && !inbox && (
        <p className="mt-2 text-[13px] font-medium text-red-500 dark:text-red-400">
          Please create a folder in the sidebar first.
        </p>
      )}
    </div>
  );
}
