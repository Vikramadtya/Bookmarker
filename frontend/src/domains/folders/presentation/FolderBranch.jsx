import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { folderSelection, selectedFolderId } from "@/lib/folderTree";
import DroppableFolderItem from "./DroppableFolderItem";
import NewFolderInput from "./NewFolderInput";

/** A folder and, below it, its subfolders to any depth. Open unless collapsed. */
export default function FolderBranch({ folder, tree }) {
  const {
    folders,
    getSubFolders,
    activeFolder,
    setActiveFolder,
    expanded,
    setExpanded,
    compact,
    creation,
    addSubfolder,
    itemProps,
  } = tree;
  const children = getSubFolders(folder.id);
  const open = expanded[folder.id] ?? true;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <div className="group/row flex items-center">
        {children.length > 0 && (
          <button
            type="button"
            aria-label={`${open ? "Collapse" : "Expand"} ${folder.name}`}
            aria-expanded={open}
            onClick={() =>
              setExpanded((prev) => ({ ...prev, [folder.id]: !open }))
            }
            className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Chevron className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <DroppableFolderItem
            {...itemProps}
            folder={folder}
            compact={compact}
            isActive={selectedFolderId(activeFolder) === folder.id}
            setActiveFolder={(id) =>
              setActiveFolder(folderSelection(folders, id))
            }
          />
        </div>
        {!compact && (
          <button
            type="button"
            aria-label={`Add a folder inside ${folder.name}`}
            title="New folder inside"
            onClick={() => addSubfolder(folder.id)}
            className="hidden shrink-0 rounded p-1 text-slate-400 group-hover/row:block hover:text-blue-500 focus-visible:block [@media(hover:none)]:block"
          >
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        )}
      </div>
      {!compact && creation.showInputFor === folder.id && (
        <NewFolderInput
          parentId={folder.id}
          className="mt-0.5 ml-4"
          creation={creation}
        />
      )}
      {open && children.length > 0 && (
        <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-1.5 dark:border-slate-800">
          {children.map((child) => (
            <FolderBranch key={child.id} folder={child} tree={tree} />
          ))}
        </div>
      )}
    </div>
  );
}
