import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Favicon } from "@/shared/ui/Favicon";
import {
  hostnameOf,
  hueFor,
} from "@/domains/bookmarks/presentation/bookmarkText";

/**
 * Preview image for a bookmark. Falls back to a gradient (stable per site) with
 * the site icon when there is no image or it fails to load.
 */
export function Thumbnail({ bookmark, pending, className }) {
  const [state, setState] = useState("loading"); // loading | loaded | failed
  const src = bookmark.imageURL;
  useEffect(() => setState("loading"), [src]);

  if (pending) {
    return <div className={cn("skeleton", className)} aria-hidden="true" />;
  }

  const hue = hueFor(hostnameOf(bookmark.bookmarkURL));
  const showImage = src && state !== "failed";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-100 dark:bg-slate-800",
        className
      )}
      style={
        showImage
          ? undefined
          : {
              backgroundImage: `linear-gradient(135deg, oklch(0.93 0.05 ${hue}), oklch(0.86 0.09 ${(hue + 50) % 360}))`,
            }
      }
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={cn(
            "h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105",
            state === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Favicon
            src={bookmark.logoURL}
            className="shadow-soft h-10 w-10 rounded-xl border-white/40 bg-white/70 backdrop-blur"
          />
        </div>
      )}
    </div>
  );
}
