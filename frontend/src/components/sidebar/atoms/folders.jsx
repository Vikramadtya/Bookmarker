import { useState } from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import bookmarkIcon from "/icons/bookmark.svg";
import { useDroppable } from "@dnd-kit/core";

const Folders = ({ folder, level = 0, activeId, onSelect, compact }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = folder.children?.length > 0;
  const isActive = folder.id === activeId;

  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: { type: "folder" },
  });

  return (
    <div>
      <div
        ref={setNodeRef}
        onClick={() =>
          hasChildren ? setExpanded(!expanded) : onSelect(folder.id)
        }
        className={`flex cursor-pointer items-center justify-between px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-gray-100 font-medium text-gray-900"
            : "hover:bg-gray-50"
        } ${isOver ? "bg-blue-50 ring-1 ring-blue-500" : ""}`}
        style={{ paddingLeft: `${compact ? 12 : level * 14 + 12}px` }}
      >
        <div className="flex items-center gap-2 truncate text-gray-700">
          {hasChildren ? (
            expanded ? (
              <FaChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <FaChevronRight className="h-3 w-3 text-gray-500" />
            )
          ) : (
            <img src={bookmarkIcon} alt={"bookmark"} height={15} width={15} />
          )}
          {!compact && <span className="truncate">{folder.name}</span>}
        </div>
        {!compact && (
          <span className="text-xs text-gray-400">{folder.count ?? 0}</span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="ml-2">
          {folder.children.map((child) => (
            <Folders
              key={child.id}
              folder={child}
              level={level + 1}
              activeId={activeId}
              onSelect={onSelect}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Folders;
