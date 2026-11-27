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
import { hasFolderToken } from "@/lib/folderTokens";
import FolderBranch from "./FolderBranch";
import NewFolderInput from "./NewFolderInput";
import { folderSelection, selectedFolderId } from "@/lib/folderTree";

export default function CollectionItem({
  collection,
  folders,
  activeFolder,
  setActiveFolder,
  toggleCollection,
  getSubFolders,
  expandedCollections,
  setExpandedCollections,
  compact,
  setPublicModalFolder,
  creation,
  addSubfolder,
  handleDeleteFolderClick,
  user,
  handleContextMenu,
  setUnlockFolderInfo,
}) {
  const tree = {
    folders,
    getSubFolders,
    activeFolder,
    setActiveFolder,
    expanded: expandedCollections,
    setExpanded: setExpandedCollections,
    compact,
    creation,
    addSubfolder,
    itemProps: {
      handleDeleteFolder: handleDeleteFolderClick,
      user,
      onContextMenu: handleContextMenu,
      onPublicIconClick: setPublicModalFolder,
      onUnlockPrompt: setUnlockFolderInfo,
    },
  };

  return (
    <div key={collection.id} className="mb-2">
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all duration-200",
          selectedFolderId(activeFolder) === collection.id
            ? "bg-slate-200/50 font-medium text-slate-900 dark:bg-slate-800/50 dark:text-slate-100"
            : "text-slate-600 hover:bg-slate-200/30 dark:text-slate-400 dark:hover:bg-slate-800/30"
        )}
        onClick={() => {
          if (collection.isLocked && !hasFolderToken(collection.id)) {
            setUnlockFolderInfo(collection);
            return;
          }
          toggleCollection(collection.id);
          // Selecting a collection shows everything inside it, however deep.
          setActiveFolder(folderSelection(folders, collection.id));
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
                addSubfolder(collection.id);
              }}
              className="hidden p-1 text-slate-400 transition-colors group-hover:block hover:text-blue-500 [@media(hover:none)]:block"
              title="New Folder"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>

      {expandedCollections[collection.id] && (
        <div className="mt-0.5 ml-5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
          {!compact && creation.showInputFor === collection.id && (
            <NewFolderInput parentId={collection.id} creation={creation} />
          )}
          {getSubFolders(collection.id).map((sub) => (
            <FolderBranch key={sub.id} folder={sub} tree={tree} />
          ))}
        </div>
      )}
    </div>
  );
}
