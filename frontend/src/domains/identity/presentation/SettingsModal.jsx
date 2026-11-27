import { useState, useRef, useEffect } from "react";
import { X, User, Download, Zap, Crown, KeyRound } from "lucide-react";
import ClaudeTab from "@/domains/identity/presentation/ClaudeTab";
import BillingTab from "@/domains/billing/presentation/BillingTab";
import AdminCodesTab from "@/domains/billing/presentation/AdminCodesTab";
import { useBilling } from "@/domains/billing/application/useBilling";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/domains/identity/application/useAuth";
import {
  useExportData,
  useImportData,
  useDeleteAllData,
  useUpdateUsername,
} from "@/domains/identity/application/useSettings";

import AccountTab from "@/domains/identity/presentation/AccountTab";
import DataTab from "@/domains/identity/presentation/DataTab";
import DangerTab from "@/domains/identity/presentation/DangerTab";
import CaptureTab from "@/domains/identity/presentation/CaptureTab";

const TAB_ALIASES = { capture: "connect", claude: "connect", danger: "data" };

export default function SettingsModal() {
  const isSettingsModalOpen = useAppStore((s) => s.isSettingsModalOpen);
  const setSettingsModalOpen = useAppStore((s) => s.setSettingsModalOpen);
  const settingsTab = useAppStore((s) => s.settingsTab);
  // Older names still used by links elsewhere in the app.
  const [activeTab, setActiveTab] = useState(
    TAB_ALIASES[settingsTab] ?? settingsTab
  );
  const { data: billing } = useBilling();

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

  // Set initial username when user loads
  useEffect(() => {
    if (userDetails?.username && newUsername === "" && !isEditingUsername) {
      setNewUsername(userDetails.username);
    }
  }, [userDetails?.username, isEditingUsername, newUsername]);

  if (!isSettingsModalOpen) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // HTML, JSON and CSV are all accepted; the server detects the format.
      importData.mutate(event.target.result);
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
            {[
              ["account", "Account", User],
              ["data", "Data", Download],
              ["connect", "Connect", Zap],
              ["billing", "Plan", Crown],
              ...(billing?.isAdmin ? [["codes", "Codes", KeyRound]] : []),
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
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
              <div className="space-y-8">
                <DataTab
                  exportData={exportData}
                  importData={importData}
                  fileInputRef={fileInputRef}
                  handleImportClick={handleImportClick}
                  handleFileChange={handleFileChange}
                />
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400">
                    Delete all my data…
                  </summary>
                  <div className="mt-3">
                    <DangerTab
                      deleteConfirmText={deleteConfirmText}
                      setDeleteConfirmText={setDeleteConfirmText}
                      handleDeleteAll={handleDeleteAll}
                      deleteAllData={deleteAllData}
                    />
                  </div>
                </details>
              </div>
            )}

            {activeTab === "connect" && (
              <div className="space-y-8">
                <ClaudeTab />
                <hr className="border-slate-200 dark:border-slate-800" />
                <CaptureTab />
              </div>
            )}
            {activeTab === "billing" && <BillingTab />}
            {activeTab === "codes" && billing?.isAdmin && <AdminCodesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
