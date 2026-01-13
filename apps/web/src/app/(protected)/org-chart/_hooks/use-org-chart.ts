"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import type { HierarchyNode } from "@/types/users";
import { orpc } from "@/utils/orpc";

export type ViewMode = "chart" | "tree";
export type Scope = "team" | "organization";

export function useOrgChart() {
  // URL-synced scope state
  const [scope, setScope] = useQueryState("scope", {
    defaultValue: "team",
    parse: (value) => value as Scope,
    serialize: (value) => value,
    shallow: false,
  });

  // View mode (not URL-synced, just local state)
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  // Track expanded node IDs
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching, error } = useQuery({
    ...orpc.users.getHierarchy.queryOptions({
      input: { scope: scope as Scope },
    }),
    placeholderData: (previousData) => previousData,
  });

  const hierarchy = (data ?? []) as HierarchyNode[];

  // Toggle a single node's expanded state
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(hierarchy);
    setExpandedNodes(allIds);
  }, [hierarchy]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Check if a node is expanded
  const isExpanded = useCallback(
    (nodeId: string) => expandedNodes.has(nodeId),
    [expandedNodes],
  );

  return {
    hierarchy,
    isLoading,
    isFetching,
    error,
    scope: scope as Scope,
    setScope: setScope as (scope: Scope) => void,
    viewMode,
    setViewMode,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    isExpanded,
  };
}
