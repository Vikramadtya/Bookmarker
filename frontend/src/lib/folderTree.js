/** Helpers for folders nested to any depth. Folders arrive as a flat list. */

const childMap = (folders) => {
  const map = new Map();
  for (const f of folders) {
    const key = f.parentId || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  return map;
};

/**
 * Every folder in tree order with its depth and full path ("Study / Java").
 * A folder whose parent is missing is listed at the top rather than lost.
 */
export function flattenFolders(folders) {
  const children = childMap(folders);
  const ids = new Set(folders.map((f) => f.id));
  const out = [];
  const seen = new Set();
  const walk = (folder, depth, trail) => {
    if (seen.has(folder.id)) return; // guards against a loop in the data
    seen.add(folder.id);
    const names = [...trail, folder.name];
    out.push({ ...folder, depth, path: names.join(" / ") });
    for (const child of children.get(folder.id) ?? [])
      walk(child, depth + 1, names);
  };
  for (const f of folders)
    if (!f.parentId || !ids.has(f.parentId)) walk(f, 0, []);
  return out;
}

// The list address and the server both limit how many folders one view can name.
const MAX_IDS = 50;

/**
 * The value that shows a folder together with everything inside it, as
 * "id,childId,...". Locked subfolders are left out: they need their password.
 */
export function folderSelection(folders, id) {
  const children = childMap(folders);
  const ids = [];
  const queue = [id];
  while (queue.length > 0 && ids.length < MAX_IDS) {
    const current = queue.shift();
    if (ids.includes(current)) continue;
    ids.push(current);
    for (const child of children.get(current) ?? [])
      if (!child.isLocked) queue.push(child.id);
  }
  return ids.join(",");
}

/** The folder a selection value refers to. */
export const selectedFolderId = (selection) => selection?.split(",")[0];
