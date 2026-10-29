const fs = require("fs");
const path = require("path");

// BUG-01 & BUG-02 & BUG-08: BookmarkList, BookmarksView, useAppStore (clearing states)
// Let's modify BookmarksView to clear selections on activeFolder change
const bookmarksView =
  "frontend/src/domains/bookmarks/presentation/BookmarksView.jsx";
if (fs.existsSync(bookmarksView)) {
  let content = fs.readFileSync(bookmarksView, "utf8");
  if (!content.includes("useEffect(() => {")) {
    content = content.replace(
      /export default function BookmarksView\(\) \{/,
      `import { useEffect } from 'react';\nexport default function BookmarksView() {`
    );
  }
  content = content.replace(
    /const \{ bookmarkFormModal, closeBookmarkModal \} = useAppStore\(\);/,
    `const { bookmarkFormModal, closeBookmarkModal, setSelectedBookmark, clearBookmarkSelection } = useAppStore();\n\n  useEffect(() => {\n    setSelectedBookmark(null);\n    clearBookmarkSelection();\n  }, [activeFolder, setSelectedBookmark, clearBookmarkSelection]);`
  );
  fs.writeFileSync(bookmarksView, content);
  console.log("Fixed BookmarksView.jsx (BUG-02, BUG-08)");
}

// BUG-01: clear selectedBookmark on delete
const bookmarkList =
  "frontend/src/domains/bookmarks/presentation/BookmarkList.jsx";
if (fs.existsSync(bookmarkList)) {
  let content = fs.readFileSync(bookmarkList, "utf8");
  content = content.replace(
    /const confirmDelete = \(\) => \{[\s\S]*?deleteBookmark\.mutate\(\n      bookmarkToDelete\.id,\n      \{\n        onSuccess: \(\) => \{/,
    `const confirmDelete = () => {
    if (!bookmarkToDelete) return;
    deleteBookmark.mutate(
      bookmarkToDelete.id,
      {
        onSuccess: () => {
          if (selectedBookmark?.id === bookmarkToDelete.id) {
            setSelectedBookmark(null);
          }`
  );
  // BUG-09: clear selectedTag on folder switch
  if (!content.includes('useEffect(() => {\n    setSelectedTag("");')) {
    content = content.replace(
      /const \[selectedTag, setSelectedTag\] = useState\(""\);/,
      `const [selectedTag, setSelectedTag] = useState("");\n  useEffect(() => {\n    setSelectedTag("");\n  }, [activeFolder]);`
    );
  }
  fs.writeFileSync(bookmarkList, content);
  console.log("Fixed BookmarkList.jsx (BUG-01, BUG-09)");
}

// BUG-03: Optimistic rollback on favorite
const bookmarkDetail =
  "frontend/src/domains/bookmarks/presentation/BookmarkDetail.jsx";
if (fs.existsSync(bookmarkDetail)) {
  let content = fs.readFileSync(bookmarkDetail, "utf8");
  content = content.replace(
    /updateBookmark\.mutate\(\{\n        id: bookmark\.id,\n        data: \{ isFavorite: newIsFavorite \},\n      \}\);/g,
    `updateBookmark.mutate({
        id: bookmark.id,
        data: { isFavorite: newIsFavorite },
      }, {
        onError: () => {
          // rollback
          setSelectedBookmark({ ...bookmark, isFavorite: !newIsFavorite });
        }
      });`
  );
  fs.writeFileSync(bookmarkDetail, content);
  console.log("Fixed BookmarkDetail.jsx (BUG-03)");
}

// BUG-05 & BUG-17: ReaderView and PublicCollectionView new URL() crash
const readerView = "frontend/src/domains/bookmarks/presentation/ReaderView.jsx";
if (fs.existsSync(readerView)) {
  let content = fs.readFileSync(readerView, "utf8");
  content = content.replace(
    /\{new URL\(bookmark\.bookmarkURL\)\.hostname\}/g,
    `{bookmark.bookmarkURL && URL.canParse(bookmark.bookmarkURL) ? new URL(bookmark.bookmarkURL).hostname : ''}`
  );
  fs.writeFileSync(readerView, content);
}

const publicCollectionView =
  "frontend/src/domains/bookmarks/presentation/PublicCollectionView.jsx";
if (fs.existsSync(publicCollectionView)) {
  let content = fs.readFileSync(publicCollectionView, "utf8");
  content = content.replace(
    /\{new URL\(b\.bookmarkURL\)\.hostname\}/g,
    `{b.bookmarkURL && URL.canParse(b.bookmarkURL) ? new URL(b.bookmarkURL).hostname : ''}`
  );
  fs.writeFileSync(publicCollectionView, content);
}

// BUG-06: BookmarkNotes race condition
const bookmarkNotes =
  "frontend/src/domains/bookmarks/presentation/BookmarkNotes.jsx";
if (fs.existsSync(bookmarkNotes)) {
  let content = fs.readFileSync(bookmarkNotes, "utf8");
  content = content.replace(
    /const updatedComments = \[\n            \.\.\.\(bookmark\.comments \|\| \[\]\),\n            newNote\.trim\(\),\n          \];\n\n          \/\/ Optimistically update local view\n          setSelectedBookmark\(\{ \.\.\.bookmark, comments: updatedComments \}\);/g,
    `const currentComments = bookmark.comments || [];
          const updatedComments = [...currentComments, newNote.trim()];
          
          setSelectedBookmark(prev => prev ? { ...prev, comments: [...(prev.comments || []), newNote.trim()] } : prev);`
  );
  fs.writeFileSync(bookmarkNotes, content);
}

// BUG-07 & BUG-32: CommandPalette hooks order and Globe import
const commandPalette =
  "frontend/src/domains/bookmarks/presentation/CommandPalette.jsx";
if (fs.existsSync(commandPalette)) {
  let content = fs.readFileSync(commandPalette, "utf8");
  // Fix Globe
  content = content.replace(
    /import \{ Search, Folder, Bookmark \} from "lucide-react";/,
    'import { Search, Folder, Bookmark, Globe } from "lucide-react";'
  );

  // Fix Hooks order
  content = content.replace(
    /if \(\!open\) return null;\n\n  const filteredFolders = useMemo\(\(\) => \{/,
    `const filteredFolders = useMemo(() => {`
  );
  content = content.replace(
    /return b\.folderId === searchFolder;\n    \}\)\n    \.slice\(0, 20\);\n  \}, \[bookmarks, searchQuery, searchFolder\]\);\n\n  const router = useRouter\(\);/g,
    `return b.folderId === searchFolder;\n    })\n    .slice(0, 20);\n  }, [bookmarks, searchQuery, searchFolder]);\n\n  const router = useRouter();\n\n  if (!open) return null;`
  );
  fs.writeFileSync(commandPalette, content);
}

// BUG-10: SettingsModal setState during render
const settingsModal =
  "frontend/src/domains/folders/presentation/SettingsModal.jsx"; // actually it's in a different folder? Wait, let's find it.
