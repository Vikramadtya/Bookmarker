import { cn } from "@/lib/utils";

/** The inline name box for a new folder: Enter creates it, Escape or leaving cancels. */
export default function NewFolderInput({
  parentId,
  placeholder = "Folder name, then Enter",
  className,
  creation,
}) {
  const {
    newFolderName,
    setNewFolderName,
    closeInput,
    handleCreateFolder,
    isPending,
  } = creation;
  return (
    <form
      onSubmit={(e) => handleCreateFolder(e, parentId)}
      className={cn("mb-1", className)}
    >
      <input
        type="text"
        autoFocus
        maxLength={100}
        aria-label="New folder name"
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && closeInput()}
        onBlur={closeInput}
        readOnly={isPending}
      />
    </form>
  );
}
