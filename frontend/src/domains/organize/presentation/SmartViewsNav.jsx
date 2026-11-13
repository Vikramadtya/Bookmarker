import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Copy,
  History,
  Inbox,
  Moon,
  Newspaper,
  Sparkles,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILTIN_VIEWS } from "@/lib/viewDefs";
import {
  useCounts,
  useDeleteView,
  useViews,
} from "@/domains/organize/application/useOrganize";
import { useNav } from "@/domains/organize/application/useNav";

const ICONS = {
  inbox: Inbox,
  clock: CalendarDays,
  history: History,
  sparkles: Sparkles,
  moon: Moon,
  alert: AlertTriangle,
  archive: Archive,
};

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  compact,
  onClick,
  onRemove,
  accent,
}) {
  return (
    <div
      onClick={onClick}
      title={compact ? label : undefined}
      className={cn(
        "group mb-0.5 flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
        compact && "justify-center px-0",
        active
          ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 stroke-[1.5]",
            active ? "text-blue-500" : (accent ?? "text-slate-400")
          )}
        />
        {!compact && <span className="truncate">{label}</span>}
      </div>
      {!compact && (
        <div className="flex items-center gap-1">
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove ${label}`}
              className="hidden rounded p-0.5 text-slate-400 group-hover:block hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {count > 0 && (
            <span className="rounded-full bg-slate-200/70 px-1.5 py-px text-[10px] font-semibold text-slate-500 tabular-nums dark:bg-slate-800 dark:text-slate-400">
              {count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Triage entry point, smart views, and the tag / duplicate / digest tools. */
export default function SmartViewsNav({ compact }) {
  const { page, viewId, goPage, goView } = useNav();
  const { data: counts } = useCounts();
  const { data: saved = [] } = useViews();
  const deleteView = useDeleteView();
  const [open, setOpen] = useState(true);

  const countFor = {
    "builtin:unread": counts?.unread,
    "builtin:dead": counts?.dead,
    "builtin:archive": counts?.archived,
  };

  return (
    <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-800/70">
      <NavItem
        icon={Zap}
        label="Triage"
        count={counts?.unread}
        active={page === "triage"}
        compact={compact}
        accent="text-blue-500"
        onClick={() => goPage("triage")}
      />

      {!compact && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 mb-1 px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-500"
        >
          Smart views
        </button>
      )}
      {(open || compact) && (
        <>
          {BUILTIN_VIEWS.map((v) => (
            <NavItem
              key={v.id}
              icon={ICONS[v.icon] ?? Inbox}
              label={v.name}
              count={countFor[v.id]}
              active={viewId === v.id}
              compact={compact}
              onClick={() => goView(v.id)}
            />
          ))}
          {saved.map((v) => (
            <NavItem
              key={v.id}
              icon={Sparkles}
              label={v.name}
              active={viewId === v.id}
              compact={compact}
              onClick={() => goView(v.id)}
              onRemove={() => deleteView.mutate(v.id)}
            />
          ))}
        </>
      )}

      <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-slate-800/70">
        <NavItem
          icon={Tag}
          label="Tags"
          active={page === "tags"}
          compact={compact}
          onClick={() => goPage("tags")}
        />
        <NavItem
          icon={Copy}
          label="Duplicates"
          count={counts?.duplicates}
          active={page === "duplicates"}
          compact={compact}
          onClick={() => goPage("duplicates")}
        />
        <NavItem
          icon={Newspaper}
          label="Weekly digest"
          active={page === "digest"}
          compact={compact}
          onClick={() => goPage("digest")}
        />
      </div>
    </div>
  );
}
