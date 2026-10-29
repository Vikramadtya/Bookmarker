import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/** Site icon that falls back to a globe when the image is missing or fails to load. */
export function Favicon({ src, className, iconClassName, boxClassName }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "shrink-0 rounded-lg border border-slate-100 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-800",
          className
        )}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50",
        className,
        boxClassName
      )}
    >
      <Globe
        className={cn(
          "h-4 w-4 stroke-[1.5] text-slate-300 dark:text-slate-600",
          iconClassName
        )}
      />
    </div>
  );
}
