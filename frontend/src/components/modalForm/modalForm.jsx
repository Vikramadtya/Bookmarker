import React, { useState, useRef } from "react";
import { X, Link2, Sparkles, Loader2, Type } from "lucide-react";
import * as z from "zod";
import { useFolders } from "@/hooks/useFolders";
import { useTags } from "@/hooks/useBookmarks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

import FolderSelect from "./fields/FolderSelect";
import NotesInput from "./fields/NotesInput";
import TagsInput from "./fields/TagsInput";

const formSchema = z.object({
  bookmarkURL: z.preprocess(
    (val) => {
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

  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const currentComments = watch("comments") || [];
  const currentTags = watch("tags") || "";

  const onSubmitForm = async (data) => {
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
            type="button"
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
            <FolderSelect
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              inbox={inbox}
              collections={collections}
              subFolders={subFolders}
            />

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
            <NotesInput
              currentComments={currentComments}
              setValue={setValue}
              isSubmitting={isSubmitting}
            />

            {/* Tags Input */}
            <TagsInput
              register={register}
              setValue={setValue}
              isSubmitting={isSubmitting}
              showTagSuggestions={showTagSuggestions}
              setShowTagSuggestions={setShowTagSuggestions}
              globalTags={globalTags}
              currentTags={currentTags}
            />

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
