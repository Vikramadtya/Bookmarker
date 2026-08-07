import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Folder, Layers, Lock, EyeOff, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateFolder } from "@/hooks/useFolders";

export default function DroppableFolderItem({
  folder,
  isActive,
  compact,
  setActiveFolder,
  handleDeleteFolder,
  isTopLevel = false,
  user,
  onContextMenu,
  onPublicIconClick,
  onUnlockPrompt,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: { type: "folder" },
  });
  const updateFolder = useUpdateFolder();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex cursor-pointer items-center justify-between rounded-lg px-3 transition-all duration-200",
        isTopLevel ? "py-2" : "py-1.5",
        isActive
          ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50",
        isOver
          ? "bg-blue-100/80 ring-1 ring-blue-500/50 dark:bg-blue-900/40"
          : ""
      )}
      onClick={() => {
        const tokens = JSON.parse(
          sessionStorage.getItem("folder_tokens") || "{}"
        );
        if (folder.isLocked && !tokens[folder.id]) {
          onUnlockPrompt?.(folder);
          return;
        }
        setActiveFolder(folder.id);
      }}
      onContextMenu={(e) => onContextMenu?.(e, folder)}
    >
      <div
        className={cn(
          "flex items-center truncate",
          isTopLevel ? "gap-3" : "gap-2"
        )}
      >
        {isTopLevel && folder.name !== "Inbox" ? (
          <Layers
            className={cn(
              "h-4 w-4 shrink-0 stroke-[1.5] transition-colors",
              isActive
                ? "text-blue-500"
                : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
            )}
          />
        ) : (
          <Folder
            className={cn(
              "shrink-0 stroke-[1.5] transition-colors",
              isTopLevel ? "h-4 w-4" : "h-3.5 w-3.5",
              isActive
                ? "text-blue-500"
                : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
            )}
          />
        )}
        {!compact && (
          <span
            className={cn(
              "flex items-center gap-1 truncate tracking-wide",
              isTopLevel ? "" : "text-xs"
            )}
          >
            {folder.name}
            {folder.isLocked && <Lock className="h-3 w-3 text-slate-400" />}
            {folder.isHidden && <EyeOff className="h-3 w-3 text-slate-400" />}
          </span>
        )}
      </div>
      {!compact && folder.isPublic && folder.name !== "Inbox" && (
        <Globe
          className="mr-1 h-3.5 w-3.5 shrink-0 cursor-pointer text-blue-500 transition-colors hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onPublicIconClick?.(folder);
          }}
          title="Public Folder"
        />
      )}
    </div>
  );
}
