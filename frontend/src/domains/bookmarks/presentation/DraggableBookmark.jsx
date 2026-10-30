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
  index,
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
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? "var(--shadow-lift)" : undefined,
  };

  const Row = isList ? BookmarkListItem : BookmarkCard;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-bookmark-id={b.id}
      onClick={() => onSelect(b.id)}
      style={
        isList
          ? style
          : { ...style, animationDelay: `${Math.min(index ?? 0, 8) * 30}ms` }
      }
      className={cn(
        "group relative cursor-pointer rounded-xl border transition-all duration-200",
        isList
          ? "p-3"
          : "animate-fade-up shadow-soft hover:shadow-lift flex h-full w-full flex-col p-3 hover:-translate-y-0.5",
        isActive
          ? "shadow-soft border-blue-300/70 bg-white ring-1 ring-blue-500/20 dark:border-blue-500/30 dark:bg-slate-900"
          : isSelected
            ? "border-blue-200 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-900/10"
            : isList
              ? "hover:shadow-soft border-transparent bg-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900"
              : "border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900"
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
