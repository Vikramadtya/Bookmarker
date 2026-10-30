import { useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const GROUPS = [
  {
    title: "Navigate",
    items: [
      [["J", "↓"], "Next bookmark"],
      [["K", "↑"], "Previous bookmark"],
      [["/"], "Focus search"],
      [[MOD, "K"], "Command palette"],
      [["V"], "Switch list / grid"],
    ],
  },
  {
    title: "Act on the selected bookmark",
    items: [
      [["O"], "Open link"],
      [["F"], "Toggle favorite"],
      [["E"], "Edit"],
      [["M"], "Move to folder"],
      [["X"], "Select for bulk actions"],
      [["D"], "Delete (with undo)"],
    ],
  },
  {
    title: "General",
    items: [
      [["N"], "New bookmark"],
      [["?"], "Show this sheet"],
      [["Esc"], "Close dialogs"],
    ],
  },
];

const Key = ({ children }) => (
  <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-600 shadow-[0_1px_0_var(--color-slate-200)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:shadow-[0_1px_0_var(--color-slate-700)]">
    {children}
  </kbd>
);

/** Opens with "?" from anywhere outside a text field. */
export default function ShortcutsDialog() {
  const isOpen = useAppStore((s) => s.isShortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "?" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(!useAppStore.getState().isShortcutsOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <m.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="shadow-lift w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Keyboard shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              {GROUPS.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {group.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {group.items.map(([keys, label]) => (
                      <li
                        key={label}
                        className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span>{label}</span>
                        <span className="flex items-center gap-1">
                          {keys.map((k) => (
                            <Key key={k}>{k}</Key>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
