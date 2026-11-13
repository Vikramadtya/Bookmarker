import { memo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { m, useMotionValue, useTransform } from "framer-motion";
import { Archive, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import BookmarkCard from "./BookmarkCard";
import BookmarkListItem from "./BookmarkListItem";

const SWIPE_THRESHOLD = 90;
const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

function DraggableBookmark({
  b,
  isActive,
  isSelected,
  breadcrumb,
  virtualItem,
  index,
  viewMode,
  compact,
  canReorder,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onOpen,
  onDelete,
  onArchive,
  onDone,
}) {
  const touch = isTouch();
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: b.id,
    data: { type: "bookmark" },
    // Touch screens use swipe actions instead of drag and drop.
    disabled: touch,
  });
  // Dropping one bookmark on another reorders them when the list is in manual order.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: b.id,
    data: { type: "bookmark" },
    disabled: !canReorder,
  });
  const setNodeRef = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

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

  // Swipe right: mark done. Swipe left: archive.
  const x = useMotionValue(0);
  const doneOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const swipe = touch && isList;

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
          ? compact
            ? "px-3 py-1.5"
            : "p-3"
          : "animate-fade-up shadow-soft hover:shadow-lift flex h-full w-full flex-col p-3 hover:-translate-y-0.5",
        swipe && "overflow-hidden",
        isOver && "ring-2 ring-blue-500/60",
        isActive
          ? "shadow-soft border-blue-300/70 bg-white ring-1 ring-blue-500/20 dark:border-blue-500/30 dark:bg-slate-900"
          : isSelected
            ? "border-blue-200 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-900/10"
            : isList
              ? "hover:shadow-soft border-transparent bg-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900"
              : "border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900"
      )}
    >
      {swipe && (
        <>
          <m.div
            style={{ opacity: doneOpacity }}
            className="absolute inset-y-0 left-0 flex w-1/2 items-center bg-emerald-500 pl-5 text-white"
          >
            <CheckCheck className="h-5 w-5" />
          </m.div>
          <m.div
            style={{ opacity: deleteOpacity }}
            className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end bg-amber-500 pr-5 text-white"
          >
            <Archive className="h-5 w-5" />
          </m.div>
        </>
      )}
      <m.div
        drag={swipe ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) onDone?.();
          else if (info.offset.x < -SWIPE_THRESHOLD) onArchive?.();
        }}
        className={cn(
          "relative z-10 h-full",
          swipe && "bg-slate-50 dark:bg-slate-950"
        )}
      >
        <Row
          b={b}
          isActive={isActive}
          isSelected={isSelected}
          breadcrumb={breadcrumb}
          compact={compact}
          onToggleSelect={onToggleSelect}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      </m.div>
    </div>
  );
}

export default memo(DraggableBookmark);
