// DOM helpers for marking highlighted passages inside the reader's article.

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function unwrapMarks(root) {
  root.querySelectorAll("mark[data-hid]").forEach((mark) => {
    mark.replaceWith(...mark.childNodes);
  });
  root.normalize();
}

/** Wraps characters [start, end) of the article's text, even across elements. */
function markRange(root, start, end, id, hasNote) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);

  let offset = 0;
  for (const node of nodes) {
    const length = node.nodeValue.length;
    const from = Math.max(start - offset, 0);
    const to = Math.min(end - offset, length);
    offset += length;
    if (from >= to) continue;

    let target = node;
    if (from > 0) target = target.splitText(from);
    if (to - from < target.nodeValue.length) target.splitText(to - from);

    const mark = document.createElement("mark");
    mark.dataset.hid = id;
    mark.className = hasNote
      ? "rounded-sm bg-amber-200/80 px-0.5 underline decoration-amber-500 decoration-dotted dark:bg-amber-400/30 dark:text-amber-50"
      : "rounded-sm bg-amber-200/80 px-0.5 dark:bg-amber-400/30 dark:text-amber-50";
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
  }
}

/** Re-applies every saved highlight; safe to call again after the list changes. */
export function applyHighlights(root, highlights) {
  if (!root) return;
  unwrapMarks(root);
  for (const h of highlights) {
    const words = h.text.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
    if (words.length === 0) continue;
    const match = new RegExp(words.join("\\s*")).exec(root.textContent);
    if (match)
      markRange(
        root,
        match.index,
        match.index + match[0].length,
        h.id,
        Boolean(h.note)
      );
  }
}
