import React, { useState } from "react";

export default function AccountTab({
  userDetails,
  isUserLoading,
  updateUsername,
  profileImageError,
  setProfileImageError,
  newUsername,
  setNewUsername,
  isEditingUsername,
  setIsEditingUsername,
}) {
  return (
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
              <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                {userDetails.email || "No email available"}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="w-20 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username
                </label>
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="h-8 rounded-md border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Username"
                    />
                    <button
                      onClick={() => {
                        if (newUsername.trim() === userDetails.username) {
                          setIsEditingUsername(false);
                          return;
                        }
                        updateUsername.mutate(newUsername, {
                          onSuccess: () => setIsEditingUsername(false),
                        });
                      }}
                      disabled={updateUsername.isPending}
                      className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setNewUsername(userDetails.username || "");
                        setIsEditingUsername(false);
                      }}
                      className="rounded-md bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {userDetails.username || "Not set"}
                    </span>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Edit
                    </button>
                  </div>
                )}
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
  );
}
