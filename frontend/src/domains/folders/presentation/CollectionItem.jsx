import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  EyeOff,
  Globe,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DroppableFolderItem from "./DroppableFolderItem";

export default function CollectionItem({
  collection,
  activeFolder,
  setActiveFolder,
  toggleCollection,
  getSubFolders,
  expandedCollections,
  setExpandedCollections,
  compact,
  setPublicModalFolder,
  setShowInputFor,
  showInputFor,
  handleCreateFolder,
  newFolderName,
  setNewFolderName,
  createFolderPending,
  handleDeleteFolderClick,
  user,
  handleContextMenu,
  setUnlockFolderInfo,
}) {
  return (
    <div key={collection.id} className="mb-2">
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all duration-200",
          activeFolder === collection.id
            ? "bg-slate-200/50 font-medium text-slate-900 dark:bg-slate-800/50 dark:text-slate-100"
            : "text-slate-600 hover:bg-slate-200/30 dark:text-slate-400 dark:hover:bg-slate-800/30"
        )}
        onClick={() => {
          const tokens = JSON.parse(
            sessionStorage.getItem("folder_tokens") || "{}"
          );
          if (collection.isLocked && !tokens[collection.id]) {
            setUnlockFolderInfo(collection);
            return;
          }
          toggleCollection(collection.id);
          const subFolderIds = getSubFolders(collection.id)
            .map((f) => f.id)
            .join(",");
          // Set active folder to collection id + children ids so the API fetches everything in the collection
          setActiveFolder(
            subFolderIds ? `${collection.id},${subFolderIds}` : collection.id
          );
        }}
        onContextMenu={(e) => handleContextMenu(e, collection)}
      >
        <div className="flex items-center gap-3 truncate">
          {expandedCollections[collection.id] ? (
            <ChevronDown className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-400" />
          )}
          {!compact && (
            <span className="flex items-center gap-2 truncate tracking-wide">
              {collection.name}
              {collection.isLocked && (
                <Lock className="h-3 w-3 text-slate-400" />
              )}
              {collection.isHidden && (
                <EyeOff className="h-3 w-3 text-slate-400" />
              )}
            </span>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-1">
            {collection.isPublic && (
              <Globe
                className="mr-1 h-3.5 w-3.5 shrink-0 cursor-pointer text-blue-500 transition-colors hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setPublicModalFolder(collection);
                }}
                title="Public Collection"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInputFor(collection.id);
                setExpandedCollections((prev) => ({
                  ...prev,
                  [collection.id]: true,
                }));
              }}
              className="hidden p-1 text-slate-400 transition-colors group-hover:block hover:text-blue-500"
              title="New Folder"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>

      {expandedCollections[collection.id] && (
        <div className="mt-0.5 ml-5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
          {!compact && showInputFor === collection.id && (
            <form
              onSubmit={(e) => handleCreateFolder(e, collection.id)}
              className="mb-1"
            >
              <input
                type="text"
                autoFocus
                placeholder="Folder name..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => setShowInputFor(null)}
                disabled={createFolderPending}
              />
            </form>
          )}
          {getSubFolders(collection.id).map((sub) => (
            <DroppableFolderItem
              key={sub.id}
              folder={sub}
              isActive={activeFolder === sub.id}
              compact={compact}
              setActiveFolder={setActiveFolder}
              handleDeleteFolder={handleDeleteFolderClick}
              user={user}
              onContextMenu={handleContextMenu}
              onPublicIconClick={setPublicModalFolder}
              onUnlockPrompt={setUnlockFolderInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
