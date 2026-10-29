import React, { useRef } from "react";
import { Tags } from "lucide-react";

export default function TagsInput({
  register,
  setValue,
  isSubmitting,
  showTagSuggestions,
  setShowTagSuggestions,
  globalTags,
  currentTags,
}) {
  const tagsContainerRef = useRef(null);

  return (
    <div>
      <label
        htmlFor="tags"
        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Tags className="h-4 w-4 text-slate-400" /> Tags{" "}
        <span className="text-xs font-normal text-slate-400">
          (Comma-separated)
        </span>
      </label>
      <div className="relative" ref={tagsContainerRef}>
        <input
          id="tags"
          placeholder="design, inspiration, tools"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
          {...register("tags")}
          onChange={(e) => {
            register("tags").onChange(e);
            setShowTagSuggestions(true);
          }}
          onFocus={() => setShowTagSuggestions(true)}
          disabled={isSubmitting}
        />

        {showTagSuggestions && globalTags.length > 0 && (
          <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {(() => {
              const currentTagsArr = currentTags
                .split(",")
                .map((t) => t.trim());
              const lastTag =
                currentTagsArr[currentTagsArr.length - 1]?.toLowerCase() || "";

              const suggestions = globalTags.filter(
                (t) =>
                  t.toLowerCase().includes(lastTag) &&
                  !currentTagsArr
                    .slice(0, -1)
                    .map((c) => c.toLowerCase())
                    .includes(t.toLowerCase())
              );

              if (suggestions.length === 0)
                return (
                  <div className="p-2 text-center text-xs text-slate-500">
                    No matching tags
                  </div>
                );

              return suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const newTags =
                      [...currentTagsArr.slice(0, -1), tag].join(", ") + ", ";
                    setValue("tags", newTags);
                    setShowTagSuggestions(false);
                    document.getElementById("tags").focus();
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {tag}
                </button>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
