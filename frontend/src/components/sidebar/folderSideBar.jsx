import {
  Folder,
  PanelLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import {
  useFolders,
  useCreateFolder,
  useDeleteFolder,
} from "@/hooks/useFolders";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BASE_URL } from "@/lib/metadata";

export default function FolderSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFolder = searchParams.get("folder") || "root";

  const setActiveFolder = (id) => {
    setSearchParams((prev) => {
      prev.set("folder", id);
      return prev;
    });
  };

  const {
    isSidebarCompact: compact,
    toggleSidebar,
    setSettingsModalOpen,
  } = useAppStore();

  const { data: folders = [], isLoading } = useFolders();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();

  const [showInputFor, setShowInputFor] = useState(null); // 'root' for collection, or collectionId for subfolder
  const [newFolderName, setNewFolderName] = useState("");
  const [profileImageError, setProfileImageError] = useState(false);

  // UI State for expanding/collapsing collections
  const [expandedCollections, setExpandedCollections] = useState({});

  const toggleCollection = (id) => {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = async (e, parentId = null) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    createFolder.mutate(
      { name: newFolderName, parentId },
      {
        onSuccess: () => {
          setNewFolderName("");
          setShowInputFor(null);
          if (parentId) {
            setExpandedCollections((prev) => ({ ...prev, [parentId]: true }));
          }
        },
      }
    );
  };

  const inbox = folders.find((f) => !f.parentId && f.name === "Inbox");
  const collections = folders.filter((f) => !f.parentId && f.name !== "Inbox");
  const getSubFolders = (collectionId) =>
    folders.filter((f) => f.parentId === collectionId);

  const [folderToDelete, setFolderToDelete] = useState(null);

  const handleDeleteFolderClick = (id) => {
    if (id === "root") return;
    setFolderToDelete(folders.find((f) => f.id === id));
  };

  const confirmDelete = (action) => {
    if (!folderToDelete) return;

    deleteFolder.mutate(
      { id: folderToDelete.id, action },
      {
        onSuccess: () => {
          if (activeFolder === folderToDelete.id) setActiveFolder("root");
          setFolderToDelete(null);
        },
        onError: () => setFolderToDelete(null),
      }
    );
  };

  const { data: user } = useAuth();

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden border-r border-slate-200 bg-slate-50/50 text-slate-700 transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
        compact ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <PanelLeft className="h-4 w-4 stroke-[1.5]" />
        </button>
        {!compact && (
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setShowInputFor("root")}
              title="New Collection"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>

      {!compact && showInputFor === "root" && (
        <form
          onSubmit={(e) => handleCreateFolder(e, null)}
          className="mb-2 px-4"
        >
          <input
            type="text"
            autoFocus
            placeholder="Collection name..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => setShowInputFor(null)}
            disabled={createFolder.isPending}
          />
        </form>
      )}

      <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 text-sm">
        <div
          className={cn(
            "group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all duration-200",
            activeFolder === "root"
              ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          )}
          onClick={() => setActiveFolder("root")}
        >
          <div className="flex items-center gap-3 truncate">
            <Layers
              className={cn(
                "h-4 w-4 shrink-0 stroke-[1.5] transition-colors",
                activeFolder === "root"
                  ? "text-blue-500"
                  : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
              )}
            />
            {!compact && (
              <span className="truncate tracking-wide">All Bookmarks</span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all duration-200",
            activeFolder === "favorites"
              ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          )}
          onClick={() => setActiveFolder("favorites")}
        >
          <div className="flex items-center gap-3 truncate">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={activeFolder === "favorites" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                activeFolder === "favorites"
                  ? "text-amber-500"
                  : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
              )}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {!compact && (
              <span className="truncate tracking-wide">Favorites</span>
            )}
          </div>
        </div>

        {inbox && (
          <div className="mb-3">
            <DroppableFolder
              folder={inbox}
              isActive={activeFolder === inbox.id}
              compact={compact}
              setActiveFolder={setActiveFolder}
              handleDeleteFolder={handleDeleteFolderClick}
              isTopLevel={true}
            />
          </div>
        )}

        {isLoading ? (
          <div className="px-3 text-xs text-slate-500">
            Loading collections...
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="mb-2">
              <div
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-all duration-200",
                  activeFolder === collection.id
                    ? "bg-slate-200/50 font-medium text-slate-900 dark:bg-slate-800/50 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-200/30 dark:text-slate-400 dark:hover:bg-slate-800/30"
                )}
                onClick={() => {
                  toggleCollection(collection.id);
                  const subFolderIds = getSubFolders(collection.id)
                    .map((f) => f.id)
                    .join(",");
                  // Set active folder to collection id + children ids so the API fetches everything in the collection
                  setActiveFolder(
                    subFolderIds
                      ? `${collection.id},${subFolderIds}`
                      : collection.id
                  );
                }}
              >
                <div className="flex items-center gap-3 truncate">
                  {expandedCollections[collection.id] ? (
                    <ChevronDown className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-400" />
                  )}
                  {!compact && (
                    <span className="truncate tracking-wide">
                      {collection.name}
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInputFor(collection.id);
                        setExpandedCollections((prev) => ({
                          ...prev,
                          [collection.id]: true,
                        }));
                      }}
                      className="p-1 text-slate-400 transition-colors hover:text-blue-500"
                      title="New Folder"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolderClick(collection.id);
                      }}
                      className="p-1 text-slate-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                )}
              </div>

              {expandedCollections[collection.id] && (
                <div className="mt-0.5 ml-5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                  {!compact && showInputFor === collection.id && (
                    <form
                      onSubmit={(e) => handleCreateFolder(e, collection.id)}
                      className="mb-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Folder name..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onBlur={() => setShowInputFor(null)}
                        disabled={createFolder.isPending}
                      />
                    </form>
                  )}
                  {getSubFolders(collection.id).map((folder) => (
                    <DroppableFolder
                      key={folder.id}
                      folder={folder}
                      isActive={activeFolder === folder.id}
                      compact={compact}
                      setActiveFolder={setActiveFolder}
                      handleDeleteFolder={handleDeleteFolderClick}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-auto space-y-1 border-t border-slate-200 p-4 dark:border-slate-800">
        {user ? (
          <div
            className={cn(
              "mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900",
              compact ? "justify-center" : ""
            )}
          >
            {user.picture && !profileImageError ? (
              <img
                src={user.picture}
                alt={user.name}
                className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase dark:bg-blue-900/30 dark:text-blue-400">
                {user.name?.charAt(0) || "U"}
              </div>
            )}
            {!compact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <button
          onClick={() => setSettingsModalOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white",
            compact && "justify-center px-0"
          )}
          title="Settings"
        >
          <Settings className="h-4 w-4 shrink-0 stroke-[1.5]" />
          {!compact && <span>Settings</span>}
        </button>
        <button
          onClick={() => {
            let authUrl = "http://localhost:8080/auth/logout";
            try {
              authUrl = new URL(BASE_URL).origin + "/auth/logout";
            } catch (e) {}
            window.location.href = authUrl;
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white",
            compact && "justify-center px-0"
          )}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 shrink-0 stroke-[1.5]" />
          {!compact && <span>Sign Out</span>}
        </button>
      </div>

      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Delete Folder
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              You are about to delete <strong>{folderToDelete.name}</strong>.
              What would you like to do with its bookmarks?
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => confirmDelete("move_to_inbox")}
                className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                disabled={deleteFolder.isPending}
              >
                Move to Inbox & Delete
              </button>
              <button
                onClick={() => confirmDelete("delete_bookmarks")}
                className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                disabled={deleteFolder.isPending}
              >
                Delete Folder & Bookmarks
              </button>
              <button
                onClick={() => setFolderToDelete(null)}
                className="w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 focus:ring-2 focus:ring-slate-500/50 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={deleteFolder.isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function DroppableFolder({
  folder,
  isActive,
  compact,
  setActiveFolder,
  handleDeleteFolder,
  isTopLevel = false,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: { type: "folder" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex cursor-pointer items-center justify-between rounded-lg px-3 transition-all duration-200",
        isTopLevel ? "py-2" : "py-1.5",
        isActive
          ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50",
        isOver
          ? "bg-blue-100/80 ring-1 ring-blue-500/50 dark:bg-blue-900/40"
          : ""
      )}
      onClick={() => setActiveFolder(folder.id)}
    >
      <div
        className={cn(
          "flex items-center truncate",
          isTopLevel ? "gap-3" : "gap-2"
        )}
      >
        {isTopLevel && folder.name !== "Inbox" ? (
          <Layers
            className={cn(
              "h-4 w-4 shrink-0 stroke-[1.5] transition-colors",
              isActive
                ? "text-blue-500"
                : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
            )}
          />
        ) : (
          <Folder
            className={cn(
              "shrink-0 stroke-[1.5] transition-colors",
              isTopLevel ? "h-4 w-4" : "h-3.5 w-3.5",
              isActive
                ? "text-blue-500"
                : "text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
            )}
          />
        )}
        {!compact && (
          <span
            className={cn(
              "truncate tracking-wide",
              isTopLevel ? "" : "text-xs"
            )}
          >
            {folder.name}
          </span>
        )}
      </div>
      {!compact && folder.name !== "Inbox" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteFolder(folder.id);
          }}
          className="hidden text-slate-400 transition-colors group-hover:block hover:text-red-500"
        >
          <Trash2 className="h-3 w-3 stroke-[1.5]" />
        </button>
      )}
    </div>
  );
}
