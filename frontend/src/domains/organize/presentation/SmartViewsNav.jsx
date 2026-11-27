import { useState } from "react";
import {
  BellRing,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  MoreHorizontal,
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
  bell: BellRing,
  inbox: Inbox,
  clock: CalendarDays,
  history: History,
  sparkles: Sparkles,
  moon: Moon,
  alert: AlertTriangle,
  archive: Archive,
};

const REMINDERS = "builtin:revisit";

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

/** Things waiting for you. Each row appears only when there is something in it. */
export function QuickNav({ compact }) {
  const { page, viewId, goPage, goView } = useNav();
  const { data: counts } = useCounts();

  return (
    <>
      {(counts?.unread > 0 || page === "triage") && (
        <NavItem
          icon={Zap}
          label="Triage"
          count={counts?.unread}
          active={page === "triage"}
          compact={compact}
          accent="text-blue-500"
          onClick={() => goPage("triage")}
        />
      )}
      {(counts?.revisit > 0 || viewId === REMINDERS) && (
        <NavItem
          icon={BellRing}
          label="Reminders due"
          count={counts?.revisit}
          active={viewId === REMINDERS}
          compact={compact}
          accent="text-amber-500"
          onClick={() => goView(REMINDERS)}
        />
      )}
    </>
  );
}

/** Smart views and library tools, folded away until wanted. */
export default function MoreNav({ compact, showHidden, onToggleHidden }) {
  const { page, viewId, goPage, goView } = useNav();
  const { data: counts } = useCounts();
  const { data: saved = [] } = useViews();
  const deleteView = useDeleteView();
  const [expanded, setExpanded] = useState(false);
  // Stay open while one of these is on screen.
  const inside = Boolean(viewId) || (Boolean(page) && page !== "triage");
  const open = expanded || inside;
  const Chevron = open ? ChevronDown : ChevronRight;

  const countFor = {
    "builtin:revisit": counts?.revisit,
    "builtin:unread": counts?.unread,
    "builtin:dead": counts?.dead,
    "builtin:archive": counts?.archived,
  };

  return (
    <div className="mt-3 border-t border-slate-200/70 pt-2 dark:border-slate-800/70">
      <button
        type="button"
        onClick={() => setExpanded(!open)}
        aria-expanded={open}
        title="More"
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50",
          compact && "justify-center px-0"
        )}
      >
        {compact ? (
          <MoreHorizontal className="h-4 w-4 stroke-[1.5]" />
        ) : (
          <>
            <Chevron className="h-4 w-4 stroke-[1.5] text-slate-400" />
            More
          </>
        )}
      </button>

      {open && (
        <div className="mt-1">
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
          <div className="my-1 border-t border-slate-200/70 dark:border-slate-800/70" />
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
          <NavItem
            icon={showHidden ? EyeOff : Eye}
            label={showHidden ? "Hide hidden folders" : "Show hidden folders"}
            compact={compact}
            onClick={onToggleHidden}
          />
        </div>
      )}
    </div>
  );
}
