import React, { useState, useRef } from "react";
import {
  X,
  Link2,
  Sparkles,
  Loader2,
  Type,
  Tags,
  MessageSquare,
  Plus,
  Trash2,
  Folder,
} from "lucide-react";
import * as z from "zod";
import { useFolders } from "@/hooks/useFolders";
import { useTags } from "@/hooks/useBookmarks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  bookmarkURL: z.preprocess(
    (val) => {
      console.log("[Zod Preprocess] Raw URL value received by Zod:", val);
      if (typeof val !== "string" || !val.trim()) return "";
      const trimmed = val.trim();
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    },
    z
      .string()
      .min(1, { message: "Please enter a website URL." })
      .url({ message: "Please enter a valid URL (e.g., https://example.com)." })
  ),
  title: z.string().optional(),
  folderId: z.string().min(1, { message: "Please select a folder." }),
  tags: z.string().optional(),
  comments: z.array(z.string()).optional(),
});

const ModalForm = ({
  onClose,
  onSubmit,
  initialData = null,
  activeFolderId = null,
}) => {
  const isEdit = !!initialData;
  const { data: folders = [] } = useFolders();
  const { data: globalTags = [] } = useTags();
  const tagsContainerRef = useRef(null);

  const subFolders = folders.filter((f) => f.parentId);
  const collections = folders.filter((f) => !f.parentId && f.name !== "Inbox");
  const inbox = folders.find((f) => !f.parentId && f.name === "Inbox");

  const parsedActiveId = activeFolderId ? activeFolderId.split(",")[0] : null;
  const defaultFolderId = initialData?.folderId
    ? initialData.folderId
    : parsedActiveId === inbox?.id
      ? inbox?.id
      : folders.find((f) => f.id === parsedActiveId)?.id || inbox?.id || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      bookmarkURL: initialData?.bookmarkURL || "",
      title: initialData?.title || "",
      folderId: defaultFolderId,
      tags: initialData?.tags?.join(", ") || "",
      comments: initialData?.comments || [],
    },
  });

  const [newComment, setNewComment] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const currentComments = watch("comments") || [];
  const currentTags = watch("tags") || "";

  const onSubmitForm = async (data) => {
    console.log("[Form Submit] Validated data ready to send:", data);
    try {
      const parsedTags = data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      await onSubmit({
        bookmarkURL: data.bookmarkURL,
        title: data.title?.trim() || undefined,
        comments: data.comments?.length > 0 ? data.comments : undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        folderId: data.folderId,
      });
    } catch (err) {
      console.error("[Form Submit] Error submitting:", err);
    }
  };

  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("[Form Validation] Errors detected:", errors);
    }
  }, [errors]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity dark:bg-slate-950/60"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:scale-100 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            <Link2 className="h-5 w-5 stroke-[1.5] text-blue-500" />{" "}
            {isEdit ? "Edit Bookmark" : "Save Bookmark"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-6 overflow-y-auto p-6">
            {/* URL Input */}
            <div>
              <label
                htmlFor="bookmarkURL"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Website URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="bookmarkURL"
                  autoFocus={!isEdit}
                  placeholder="https://example.com"
                  className={cn(
                    "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900",
                    errors.bookmarkURL
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700"
                  )}
                  value={watch("bookmarkURL") || ""}
                  onChange={(e) =>
                    setValue("bookmarkURL", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>
              {errors.bookmarkURL && (
                <p className="mt-1.5 text-[13px] text-red-500">
                  {errors.bookmarkURL.message}
                </p>
              )}
            </div>

            {/* Folder Selection */}
            <div>
              <label
                htmlFor="folderId"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Folder className="h-4 w-4 text-slate-400" /> Destination Folder{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                id="folderId"
                className={cn(
                  "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:bg-white focus:ring-4 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900",
                  errors.folderId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700"
                )}
                {...register("folderId")}
                disabled={isSubmitting || (subFolders.length === 0 && !inbox)}
              >
                <option value="" disabled>
                  Select a folder
                </option>
                {inbox && (
                  <option
                    value={inbox.id}
                    className="font-semibold text-blue-600 dark:text-blue-400"
                  >
                    📥 {inbox.name}
                  </option>
                )}
                {collections.map((collection) => (
                  <optgroup key={collection.id} label={collection.name}>
                    <option
                      value={collection.id}
                      className="text-slate-500 italic"
                    >
                      📁 {collection.name} (Root)
                    </option>
                    {subFolders
                      .filter((f) => f.parentId === collection.id)
                      .map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          └ {folder.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {errors.folderId && (
                <p className="mt-1.5 text-[13px] text-red-500">
                  {errors.folderId.message}
                </p>
              )}
              {subFolders.length === 0 && !inbox && (
                <p className="mt-2 text-[13px] font-medium text-red-500 dark:text-red-400">
                  Please create a folder in the sidebar first.
                </p>
              )}
            </div>

            {/* Title Input */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Type className="h-4 w-4 text-slate-400" /> Title{" "}
                <span className="text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>
              <input
                id="title"
                placeholder={
                  isEdit ? "Enter a custom title" : "Leave blank to auto-fetch"
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
                {...register("title")}
                disabled={isSubmitting}
              />
            </div>

            {/* Comments Input */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <MessageSquare className="h-4 w-4 text-slate-400" /> Notes{" "}
                <span className="text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <div className="mb-3 space-y-3">
                {currentComments.map((comment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      {comment}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "comments",
                          currentComments.filter((_, i) => i !== index)
                        )
                      }
                      className="p-1 text-slate-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Add a new note..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newComment.trim()) {
                        setValue("comments", [
                          ...currentComments,
                          newComment.trim(),
                        ]);
                        setNewComment("");
                      }
                    }
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newComment.trim()) {
                      setValue("comments", [
                        ...currentComments,
                        newComment.trim(),
                      ]);
                      setNewComment("");
                    }
                  }}
                  disabled={!newComment.trim() || isSubmitting}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tags Input */}
            <div>
              <label
                htmlFor="tags"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <Tags className="h-4 w-4 text-slate-400" /> Tags{" "}
                <span className="text-xs font-normal text-slate-400">
                  (Comma-separated)
                </span>
              </label>
              <div className="relative" ref={tagsContainerRef}>
                <input
                  id="tags"
                  placeholder="design, inspiration, tools"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20"
                  {...register("tags")}
                  onChange={(e) => {
                    register("tags").onChange(e);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  disabled={isSubmitting}
                />

                {showTagSuggestions && globalTags.length > 0 && (
                  <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {(() => {
                      const currentTagsArr = currentTags
                        .split(",")
                        .map((t) => t.trim());
                      const lastTag =
                        currentTagsArr[
                          currentTagsArr.length - 1
                        ]?.toLowerCase() || "";

                      const suggestions = globalTags.filter(
                        (t) =>
                          t.toLowerCase().includes(lastTag) &&
                          !currentTagsArr
                            .slice(0, -1)
                            .map((c) => c.toLowerCase())
                            .includes(t.toLowerCase())
                      );

                      if (suggestions.length === 0)
                        return (
                          <div className="p-2 text-center text-xs text-slate-500">
                            No matching tags
                          </div>
                        );

                      return suggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const newTags =
                              [...currentTagsArr.slice(0, -1), tag].join(", ") +
                              ", ";
                            setValue("tags", newTags);
                            setShowTagSuggestions(false);
                            document.getElementById("tags").focus();
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {tag}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {!isEdit && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 shrink-0 stroke-[1.5] text-blue-500" />
                  <p className="text-sm leading-relaxed font-medium text-blue-700 dark:text-blue-300">
                    Just paste the link! Our backend will automatically fetch
                    the title, description, and icon for you if you leave them
                    blank.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (subFolders.length === 0 && !inbox)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-blue-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[1.5]" />{" "}
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Save Bookmark"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;
