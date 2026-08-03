import { useState, useRef } from "react";
import { X, User, Download, Upload, AlertTriangle, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import {
  useExportData,
  useImportData,
  useDeleteAllData,
} from "@/hooks/useSettings";

export default function SettingsModal() {
  const { isSettingsModalOpen, setSettingsModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState("account");

  const { data: userDetails, isLoading: isUserLoading } = useAuth();
  const exportData = useExportData();
  const importData = useImportData();
  const deleteAllData = useDeleteAllData();

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const fileInputRef = useRef(null);
  const [profileImageError, setProfileImageError] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const htmlContent = event.target.result;
      importData.mutate(htmlContent);
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again if needed
    e.target.value = "";
  };

  const handleDeleteAll = () => {
    if (deleteConfirmText === "DELETE") {
      deleteAllData.mutate(undefined, {
        onSuccess: () => {
          setDeleteConfirmText("");
          setSettingsModalOpen(false);
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[600px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 space-y-1 border-r border-slate-200 p-4 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("account")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "account"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
              }`}
            >
              <User className="h-4 w-4" />
              Account
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "data"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
              }`}
            >
              <Download className="h-4 w-4" />
              Data Management
            </button>
            <button
              onClick={() => setActiveTab("danger")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "danger"
                  ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    Account Details
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    View your profile information.
                  </p>
                </div>

                {isUserLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800"></div>
                    <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800"></div>
                  </div>
                ) : userDetails ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {userDetails.picture && !profileImageError ? (
                        <img
                          src={userDetails.picture}
                          alt="Avatar"
                          className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                          onError={() => setProfileImageError(true)}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600 uppercase dark:bg-blue-900/30 dark:text-blue-400">
                          {userDetails.name?.charAt(0) || "U"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {userDetails.name || "User"}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {userDetails.email || "No email available"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    Could not load user details.
                  </div>
                )}
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    Data Management
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Export or import your bookmarks using the universal Netscape
                    HTML format.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        Export Bookmarks
                      </h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Download all your folders and bookmarks as an HTML file.
                      </p>
                    </div>
                    <button
                      onClick={() => exportData.mutate()}
                      disabled={exportData.isPending}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {exportData.isPending ? "Exporting..." : "Export HTML"}
                    </button>
                  </div>

                  <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        Import Bookmarks
                      </h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Upload a Netscape Bookmark HTML file to add to your
                        collection.
                      </p>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <button
                        onClick={handleImportClick}
                        disabled={importData.isPending}
                        className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Upload className="h-4 w-4" />
                        {importData.isPending ? "Importing..." : "Import HTML"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-red-600 dark:text-red-400">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Irreversible actions for your account data.
                  </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
                  <div className="mb-2 flex items-center gap-3 font-medium text-red-700 dark:text-red-400">
                    <Trash2 className="h-5 w-5" />
                    Delete All Data
                  </div>
                  <p className="mb-4 text-sm text-red-600/80 dark:text-red-400/80">
                    This will permanently delete all your folders and bookmarks.
                    This action cannot be undone.
                  </p>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Type <span className="font-bold">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      onClick={handleDeleteAll}
                      disabled={
                        deleteConfirmText !== "DELETE" ||
                        deleteAllData.isPending
                      }
                      className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500/50 focus:outline-none disabled:opacity-50"
                    >
                      {deleteAllData.isPending
                        ? "Deleting..."
                        : "Delete All My Data"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
