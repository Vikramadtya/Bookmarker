/**
 * The bookmark ribbon that draws itself, fills in and hops. Its styles live in
 * index.html so the same animation shows before any JavaScript has loaded.
 */
export default function BookmarkLoader({ size = 40, label, className = "" }) {
  return (
    <div
      role="status"
      aria-label={label || "Loading"}
      className={`bm-loader ${className}`}
    >
      <svg
        width={size}
        height={Math.round(size * 1.3)}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          className="bm-ribbon"
          pathLength="60"
          d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
        />
      </svg>
      <div className="bm-shadow" style={{ width: size * 0.55 }} />
      {label && <span className="bm-label">{label}</span>}
    </div>
  );
}

/** Full-screen version used while the app starts. Matches the splash in index.html. */
export function BookmarkSplash() {
  return (
    <div className="bm-splash">
      <BookmarkLoader />
    </div>
  );
}
