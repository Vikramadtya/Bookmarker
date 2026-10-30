import { useEffect, useMemo, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Minus, Plus } from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { Favicon } from "@/shared/ui/Favicon";
import { hostnameOf } from "./bookmarkText";

const PREFS_KEY = "reader-prefs";
const SIZES = [15, 16, 17, 18, 20, 22];
const WORDS_PER_MINUTE = 220;

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      size: SIZES.includes(saved.size) ? saved.size : 18,
      serif: saved.serif ?? true,
    };
  } catch {
    return { size: 18, serif: true };
  }
}

function minutesToRead(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

const toolButton =
  "flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export default function ReaderView({ bookmark, isOpen, onClose }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef(null);

  const html = useMemo(
    () => DOMPurify.sanitize(bookmark?.content ?? ""),
    [bookmark?.content]
  );
  const minutes = useMemo(() => minutesToRead(html), [html]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage can be unavailable; the preference just won't persist */
    }
  }, [prefs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !bookmark) return null;

  const sizeIndex = SIZES.indexOf(prefs.size);
  const step = (delta) =>
    setPrefs((p) => ({ ...p, size: SIZES[sizeIndex + delta] ?? p.size }));

  const onScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const max = scrollHeight - clientHeight;
    setProgress(max > 0 ? Math.min(1, scrollTop / max) : 1);
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <m.div
          role="dialog"
          aria-label={`Reading ${bookmark.title}`}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="shadow-lift relative flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white sm:max-h-[92vh] sm:rounded-2xl dark:bg-slate-900"
        >
          {/* Reading progress */}
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-transparent">
            <div
              className="h-full bg-blue-500 transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-3">
              <Favicon
                src={bookmark.logoURL}
                className="h-9 w-9 rounded-xl p-1.5"
                iconClassName="h-4 w-4"
              />
              <div className="min-w-0">
                <a
                  href={bookmark.bookmarkURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
                >
                  <span className="truncate">
                    {hostnameOf(bookmark.bookmarkURL)}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <p className="text-xs text-slate-400">{minutes} min read</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => step(-1)}
                disabled={sizeIndex <= 0}
                aria-label="Smaller text"
                className={toolButton}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-[11px] text-slate-400 tabular-nums">
                {prefs.size}
              </span>
              <button
                onClick={() => step(1)}
                disabled={sizeIndex >= SIZES.length - 1}
                aria-label="Larger text"
                className={toolButton}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={() => setPrefs((p) => ({ ...p, serif: !p.serif }))}
                aria-pressed={prefs.serif}
                title="Toggle serif font"
                className={cn(
                  toolButton,
                  "w-9 text-sm",
                  prefs.serif ? "font-serif" : "font-sans"
                )}
              >
                Aa
              </button>
              <button
                onClick={onClose}
                aria-label="Close reader"
                className="ml-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto bg-white px-5 py-8 sm:px-10 sm:py-12 dark:bg-slate-950"
          >
            <div className="mx-auto max-w-[42rem]">
              <h1 className="mb-8 text-3xl leading-tight font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {bookmark.title}
              </h1>
              <article
                style={{ fontSize: prefs.size, lineHeight: 1.75 }}
                className={cn(
                  "prose prose-slate dark:prose-invert prose-headings:font-sans prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-2xl prose-p:my-[1.1em] max-w-none",
                  prefs.serif && "font-serif"
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
