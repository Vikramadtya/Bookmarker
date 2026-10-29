// Unlock tokens for password-protected folders, kept per browser tab.
const KEY = "folder_tokens";

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export const getFolderToken = (key) => read()[key];
export const hasFolderToken = (key) => Boolean(read()[key]);

export function setFolderToken(key, token) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...read(), [key]: token }));
  } catch {
    // storage unavailable (private mode): the folder simply re-prompts next time
  }
}

/** Request headers for a folder view; a comma-separated id list uses the first id with a token. */
export function folderTokenHeaders(folderIds) {
  const id = String(folderIds || "")
    .split(",")
    .find((candidate) => hasFolderToken(candidate));
  return id ? { "x-folder-token": getFolderToken(id) } : {};
}
