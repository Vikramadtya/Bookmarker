import { useState, useRef } from "react";
import { X, User, Download, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import {
  useExportData,
  useImportData,
  useDeleteAllData,
  useUpdateUsername,
} from "@/hooks/useSettings";

import AccountTab from "./AccountTab";
import DataTab from "./DataTab";
import DangerTab from "./DangerTab";

export default function SettingsModal() {
  const { isSettingsModalOpen, setSettingsModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState("account");

  const { data: userDetails, isLoading: isUserLoading } = useAuth();
  const exportData = useExportData();
  const importData = useImportData();
  const deleteAllData = useDeleteAllData();
  const updateUsername = useUpdateUsername();

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const fileInputRef = useRef(null);
  const [profileImageError, setProfileImageError] = useState(false);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  if (!isSettingsModalOpen) return null;

  // Set initial username when user loads
  if (userDetails?.username && newUsername === "" && !isEditingUsername) {
    setNewUsername(userDetails.username);
  }

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
          <div className="w-56 shrink-0 space-y-1 border-r border-slate-200 p-4 dark:border-slate-800">
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
              <AccountTab
                userDetails={userDetails}
                isUserLoading={isUserLoading}
                updateUsername={updateUsername}
                profileImageError={profileImageError}
                setProfileImageError={setProfileImageError}
                newUsername={newUsername}
                setNewUsername={setNewUsername}
                isEditingUsername={isEditingUsername}
                setIsEditingUsername={setIsEditingUsername}
              />
            )}

            {activeTab === "data" && (
              <DataTab
                exportData={exportData}
                importData={importData}
                fileInputRef={fileInputRef}
                handleImportClick={handleImportClick}
                handleFileChange={handleFileChange}
              />
            )}

            {activeTab === "danger" && (
              <DangerTab
                deleteConfirmText={deleteConfirmText}
                setDeleteConfirmText={setDeleteConfirmText}
                handleDeleteAll={handleDeleteAll}
                deleteAllData={deleteAllData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
