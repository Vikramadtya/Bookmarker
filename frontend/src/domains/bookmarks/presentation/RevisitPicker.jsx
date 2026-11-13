import { BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { REVISIT_PRESETS } from "@/lib/revisit";

/** Chips for "remind me to look at this again". Click the chosen one again to clear. */
export default function RevisitPicker({ value, onChange, label = true }) {
  return (
    <div>
      {label && (
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <BellRing className="h-3.5 w-3.5" /> Revisit later
          <span className="font-normal text-slate-400">(optional)</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {REVISIT_PRESETS.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active ? null : p.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
                active
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
