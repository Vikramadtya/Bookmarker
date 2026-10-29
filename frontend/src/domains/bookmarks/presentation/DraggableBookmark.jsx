import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import BookmarkCard from "./BookmarkCard";
import BookmarkListItem from "./BookmarkListItem";

function DraggableBookmark({
  b,
  isActive,
  isSelected,
  breadcrumb,
  virtualItem,
  viewMode,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onDelete,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: b.id,
      data: { type: "bookmark" },
    });

  const isList = viewMode === "list";
  const style = {
    position: isList ? "absolute" : "relative",
    top: isList && virtualItem ? `${virtualItem.start}px` : "auto",
    left: 0,
    width: "100%",
    height: isList && virtualItem ? `${virtualItem.size - 8}px` : "auto",
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const Row = isList ? BookmarkListItem : BookmarkCard;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(b.id)}
      style={style}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl transition-colors duration-200",
        isList ? "p-3" : "flex h-full w-full flex-col p-4 shadow-sm",
        isActive
          ? "border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:border-slate-800 dark:bg-slate-900"
          : isSelected
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-900/10"
            : "border border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900"
      )}
    >
      <div className="relative z-10 h-full">
        <Row
          b={b}
          isActive={isActive}
          isSelected={isSelected}
          breadcrumb={breadcrumb}
          onToggleSelect={onToggleSelect}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export default memo(DraggableBookmark);
