import { cn } from "@/lib/utils";

/** Stacked cards illustration shared by every empty state. */
function Illustration({ className }) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      className={cn("h-24 w-30", className)}
      aria-hidden="true"
    >
      <rect
        x="22"
        y="18"
        width="76"
        height="52"
        rx="10"
        className="fill-slate-100 stroke-slate-200 dark:fill-slate-800/60 dark:stroke-slate-700"
        transform="rotate(-6 60 44)"
      />
      <rect
        x="22"
        y="22"
        width="76"
        height="52"
        rx="10"
        className="fill-slate-50 stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700"
        transform="rotate(4 60 48)"
      />
      <rect
        x="20"
        y="26"
        width="80"
        height="54"
        rx="10"
        className="fill-white stroke-slate-200 dark:fill-slate-900 dark:stroke-slate-700"
      />
      <rect
        x="30"
        y="36"
        width="22"
        height="16"
        rx="4"
        className="fill-blue-100 dark:fill-blue-500/20"
      />
      <rect
        x="58"
        y="38"
        width="32"
        height="4"
        rx="2"
        className="fill-slate-200 dark:fill-slate-700"
      />
      <rect
        x="58"
        y="47"
        width="22"
        height="4"
        rx="2"
        className="fill-slate-100 dark:fill-slate-800"
      />
      <rect
        x="30"
        y="60"
        width="60"
        height="4"
        rx="2"
        className="fill-slate-100 dark:fill-slate-800"
      />
      <path
        d="M96 14l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"
        className="fill-blue-400"
      />
    </svg>
  );
}

export function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col items-center px-6 py-12 text-center",
        className
      )}
    >
      <Illustration />
      <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
