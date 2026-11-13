import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BUILTIN_VIEWS } from "@/lib/viewDefs";
import { useViews } from "./useOrganize";

/**
 * Where the user is in the workspace, kept in the URL: a folder, a smart view,
 * or a full-page tool (triage, tags, duplicates, digest). One of the three at a time.
 */
export function useNav() {
  const [params, setParams] = useSearchParams();
  const { data: savedViews = [] } = useViews();

  const page = params.get("page");
  const viewId = params.get("view");
  const folder = params.get("folder") || "root";

  const view = useMemo(
    () =>
      [...BUILTIN_VIEWS, ...savedViews].find((v) => v.id === viewId) ?? null,
    [viewId, savedViews]
  );

  const go = useCallback(
    (key, value) =>
      setParams((prev) => {
        for (const k of ["folder", "view", "page"]) prev.delete(k);
        if (key && value) prev.set(key, value);
        return prev;
      }),
    [setParams]
  );

  return {
    page,
    folder,
    view,
    viewId,
    goPage: (p) => go("page", p),
    goView: (id) => go("view", id),
    goFolder: (id) => go("folder", id),
  };
}
