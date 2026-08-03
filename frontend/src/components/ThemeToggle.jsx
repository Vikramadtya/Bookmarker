import { useAppStore } from "@/store/useAppStore";
import { FaSun, FaMoon } from "react-icons/fa";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
      title="Toggle Theme"
    >
      {theme === "dark" ? (
        <FaSun className="h-4 w-4" />
      ) : (
        <FaMoon className="h-4 w-4" />
      )}
    </button>
  );
}
