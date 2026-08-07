import {
  PanelLeft,
  Plus,
  Layers,
  LogOut,
  Settings,
  EyeOff,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import {
  useFolders,
  useCreateFolder,
  useDeleteFolder,
  useUpdateFolder,
} from "@/hooks/useFolders";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

import DeleteFolderModal from "../modals/DeleteFolderModal";
import PublicFolderModal from "../modals/PublicFolderModal";
import UnlockFolderModal from "../modals/UnlockFolderModal";
import FolderContextMenu from "./FolderContextMenu";
import DroppableFolderItem from "./DroppableFolderItem";
import CollectionItem from "./CollectionItem";

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
  const updateFolder = useUpdateFolder();

  const [showInputFor, setShowInputFor] = useState(null); // 'root' for collection, or collectionId for subfolder
  const [newFolderName, setNewFolderName] = useState("");
  const [profileImageError, setProfileImageError] = useState(false);

  // UI State for expanding/collapsing collections
  const [expandedCollections, setExpandedCollections] = useState({});
  const [showHidden, setShowHidden] = useState(false);
  const [unlockFolderInfo, setUnlockFolderInfo] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

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
  const visibleCollections = folders.filter(
    (f) => !f.parentId && f.name !== "Inbox" && !f.isHidden
  );
  const hiddenCollections = folders.filter(
    (f) => !f.parentId && f.name !== "Inbox" && f.isHidden
  );
  const getSubFolders = (collectionId) =>
    folders.filter((f) => f.parentId === collectionId);

  const [folderToDelete, setFolderToDelete] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [publicModalFolder, setPublicModalFolder] = useState(null);

  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    if (folder.name === "Inbox") return; // Inbox can't be modified
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder,
    });
  };

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
            <DroppableFolderItem
              folder={inbox}
              isActive={activeFolder === inbox.id}
              compact={compact}
              setActiveFolder={setActiveFolder}
              handleDeleteFolder={handleDeleteFolderClick}
              isTopLevel={true}
              user={user}
              onContextMenu={handleContextMenu}
              onPublicIconClick={setPublicModalFolder}
              onUnlockPrompt={setUnlockFolderInfo}
            />
          </div>
        )}

        {isLoading ? (
          <div className="px-3 text-xs text-slate-500">
            Loading collections...
          </div>
        ) : (
          <>
            {visibleCollections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                activeFolder={activeFolder}
                setActiveFolder={setActiveFolder}
                toggleCollection={toggleCollection}
                getSubFolders={getSubFolders}
                expandedCollections={expandedCollections}
                setExpandedCollections={setExpandedCollections}
                compact={compact}
                setPublicModalFolder={setPublicModalFolder}
                setShowInputFor={setShowInputFor}
                showInputFor={showInputFor}
                handleCreateFolder={handleCreateFolder}
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                createFolderPending={createFolder.isPending}
                handleDeleteFolderClick={handleDeleteFolderClick}
                user={user}
                handleContextMenu={handleContextMenu}
                setUnlockFolderInfo={setUnlockFolderInfo}
              />
            ))}
            {showHidden && hiddenCollections.length > 0 && (
              <>
                {!compact && (
                  <div className="mt-6 mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Hidden Collections
                  </div>
                )}
                {hiddenCollections.map((collection) => (
                  <CollectionItem
                    key={collection.id}
                    collection={collection}
                    activeFolder={activeFolder}
                    setActiveFolder={setActiveFolder}
                    toggleCollection={toggleCollection}
                    getSubFolders={getSubFolders}
                    expandedCollections={expandedCollections}
                    setExpandedCollections={setExpandedCollections}
                    compact={compact}
                    setPublicModalFolder={setPublicModalFolder}
                    setShowInputFor={setShowInputFor}
                    showInputFor={showInputFor}
                    handleCreateFolder={handleCreateFolder}
                    newFolderName={newFolderName}
                    setNewFolderName={setNewFolderName}
                    createFolderPending={createFolder.isPending}
                    handleDeleteFolderClick={handleDeleteFolderClick}
                    user={user}
                    handleContextMenu={handleContextMenu}
                    setUnlockFolderInfo={setUnlockFolderInfo}
                  />
                ))}
              </>
            )}
          </>
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
          onClick={() => setShowHidden(!showHidden)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white",
            compact && "justify-center px-0"
          )}
          title={
            showHidden ? "Hide Hidden Collections" : "Show Hidden Collections"
          }
        >
          {showHidden ? (
            <EyeOff className="h-4 w-4 shrink-0 stroke-[1.5]" />
          ) : (
            <Eye className="h-4 w-4 shrink-0 stroke-[1.5]" />
          )}
          {!compact && (
            <span>{showHidden ? "Hide Hidden" : "Show Hidden"}</span>
          )}
        </button>

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
            window.dispatchEvent(new Event("unauthorized"));
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

      <DeleteFolderModal
        folderToDelete={folderToDelete}
        setFolderToDelete={setFolderToDelete}
        confirmDelete={confirmDelete}
        isPending={deleteFolder.isPending}
      />

      <FolderContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        setPublicModalFolder={setPublicModalFolder}
        updateFolder={updateFolder}
        handleDeleteFolderClick={handleDeleteFolderClick}
      />

      <PublicFolderModal
        publicModalFolder={publicModalFolder}
        setPublicModalFolder={setPublicModalFolder}
        updateFolder={updateFolder}
        user={user}
      />

      <UnlockFolderModal
        unlockFolderInfo={unlockFolderInfo}
        setUnlockFolderInfo={setUnlockFolderInfo}
        unlockPassword={unlockPassword}
        setUnlockPassword={setUnlockPassword}
        unlockError={unlockError}
        setUnlockError={setUnlockError}
        isUnlocking={isUnlocking}
        setIsUnlocking={setIsUnlocking}
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
      />
    </aside>
  );
}
