import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  isFavorite,
  onClick,
  className,
  iconClassName,
}) {
  return (
    <button
      onClick={onClick}
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      className={cn(
        "rounded-md p-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800",
        isFavorite
          ? "text-amber-500 opacity-100"
          : "text-slate-400 hover:text-amber-500",
        className
      )}
    >
      <Star
        className={cn("h-4 w-4 stroke-[1.5]", iconClassName)}
        fill={isFavorite ? "currentColor" : "none"}
      />
    </button>
  );
}
