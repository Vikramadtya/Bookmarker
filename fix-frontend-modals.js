const fs = require("fs");

// BUG-10: SettingsModal
const settingsModal =
  "frontend/src/domains/identity/presentation/SettingsModal.jsx";
if (fs.existsSync(settingsModal)) {
  let content = fs.readFileSync(settingsModal, "utf8");
  content = content.replace(
    /if \(userDetails\?\.username && newUsername === "" && !isEditingUsername\) \{\n    setNewUsername\(userDetails\.username\);\n  \}/g,
    `useEffect(() => {
    if (userDetails?.username && newUsername === "" && !isEditingUsername) {
      setNewUsername(userDetails.username);
    }
  }, [userDetails?.username, isEditingUsername, newUsername]);`
  );
  fs.writeFileSync(settingsModal, content);
}

// BUG-12: MoveBookmarkModal
const moveModal =
  "frontend/src/domains/bookmarks/presentation/MoveBookmarkModal.jsx";
if (fs.existsSync(moveModal)) {
  let content = fs.readFileSync(moveModal, "utf8");
  content = content.replace(
    /id: moveBookmarkModal\.bookmark\.id,/g,
    `id: moveBookmarkModal.bookmark?.id,`
  );
  content = content.replace(
    /const handleMove = \(\) => \{/g,
    `const handleMove = () => {
    if (!moveBookmarkModal.bookmark) return;`
  );
  fs.writeFileSync(moveModal, content);
}

// BUG-14: UnlockFolderModal
const unlockModal =
  "frontend/src/domains/folders/presentation/UnlockFolderModal.jsx";
if (fs.existsSync(unlockModal)) {
  let content = fs.readFileSync(unlockModal, "utf8");
  content = content.replace(
    /url: \`\/api\/v1\/folders\/\$\{unlockFolderInfo\.id\}\/unlock\`,/g,
    `url: \`\${BASE_URL}/folders/\${unlockFolderInfo.id}/unlock\`,`
  );
  if (!content.includes("import { BASE_URL }")) {
    content = content.replace(
      /import axios from "axios";/,
      `import axios from "axios";\nimport { BASE_URL } from "@/lib/metadata";`
    );
  }
  fs.writeFileSync(unlockModal, content);
}

// BUG-13: useFolders.js (invalidate bookmarks on folder delete)
const useFolders = "frontend/src/domains/folders/application/useFolders.js";
if (fs.existsSync(useFolders)) {
  let content = fs.readFileSync(useFolders, "utf8");
  content = content.replace(
    /onSuccess: \(\) => \{\n      queryClient\.invalidateQueries\(\{ queryKey: \["folders"\] \}\);\n    \},/g,
    `onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },`
  );
  fs.writeFileSync(useFolders, content);
}
