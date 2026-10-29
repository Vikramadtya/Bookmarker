import { useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Manages the active folder selection (URL search param) and the
 * expand/collapse state of collection items in the sidebar.
 *
 * Centralising this logic avoids three separate pieces of state spread
 * across FolderSideBar and its children.
 */
export function useFolderNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFolder = searchParams.get("folder") || "root";

  const [expandedCollections, setExpandedCollections] = useState({});

  const setActiveFolder = (id) => {
    setSearchParams((prev) => {
      prev.set("folder", id);
      return prev;
    });
  };

  const toggleCollection = (id) => {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandCollection = (id) => {
    setExpandedCollections((prev) => ({ ...prev, [id]: true }));
  };

  return {
    activeFolder,
    setActiveFolder,
    expandedCollections,
    setExpandedCollections,
    toggleCollection,
    expandCollection,
  };
}
