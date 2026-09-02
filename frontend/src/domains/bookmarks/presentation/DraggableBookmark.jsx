import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import BookmarkCard from "./BookmarkCard";
import BookmarkListItem from "./BookmarkListItem";

export default function DraggableBookmark({
  b,
  selectedId,
  onSelect,
  virtualItem,
  handleDelete,
  isSelected,
  toggleSelection,
  handleToggleFavorite,
  folders,
  viewMode = "list",
}) {
  const [imageError, setImageError] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: b.id,
      data: { type: "bookmark" },
    });

  const getFolderBreadcrumb = () => {
    if (!b.folderId || !folders || b.folderId === "root") return null;
    const folder = folders.find((f) => f.id === b.folderId);
    if (!folder) return null;
    if (folder.parentId) {
      const parent = folders.find((f) => f.id === folder.parentId);
      return parent ? `${parent.name} / ${folder.name}` : folder.name;
    }
    return folder.name;
  };

  const breadcrumb = getFolderBreadcrumb();

  const style = {
    position: viewMode === "list" ? "absolute" : "relative",
    top: viewMode === "list" && virtualItem ? `${virtualItem.start}px` : "auto",
    left: 0,
    width: "100%",
    height:
      viewMode === "list" && virtualItem ? `${virtualItem.size - 8}px` : "auto",
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect(b)}
      style={style}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-200",
        viewMode === "grid"
          ? "flex h-full w-full flex-col p-4 shadow-sm"
          : "p-3",
        selectedId === b.id
          ? "border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:border-slate-800 dark:bg-slate-900"
          : isSelected
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-900/10"
            : "border border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-800 dark:hover:bg-slate-900"
      )}
    >
      <div
        className={cn(
          "relative z-10",
          viewMode === "grid"
            ? "flex h-full flex-col gap-4"
            : "flex h-full items-center justify-between gap-3"
        )}
      >
        {viewMode === "grid" ? (
          <BookmarkCard
            b={b}
            selectedId={selectedId}
            isSelected={isSelected}
            toggleSelection={toggleSelection}
            handleToggleFavorite={handleToggleFavorite}
            handleDelete={handleDelete}
            breadcrumb={breadcrumb}
            imageError={imageError}
            setImageError={setImageError}
          />
        ) : (
          <BookmarkListItem
            b={b}
            selectedId={selectedId}
            isSelected={isSelected}
            toggleSelection={toggleSelection}
            handleToggleFavorite={handleToggleFavorite}
            handleDelete={handleDelete}
            breadcrumb={breadcrumb}
            imageError={imageError}
            setImageError={setImageError}
          />
        )}
      </div>
    </motion.div>
  );
}
