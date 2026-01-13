"use client";

import { cn } from "@/lib/utils";
import type { HierarchyNode } from "@/types/users";
import { UserCard } from "./user-card";

interface TreeListViewProps {
  nodes: HierarchyNode[];
  isExpanded: (nodeId: string) => boolean;
  onToggle: (nodeId: string) => void;
  level?: number;
}

export function TreeListView({
  nodes,
  isExpanded,
  onToggle,
  level = 0,
}: TreeListViewProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-0.5", level > 0 && "border-muted border-l-2")}>
      {nodes.map((node) => {
        const expanded = isExpanded(node.id);
        const hasChildren = node.children.length > 0;

        return (
          <div className={cn(level > 0 && "ml-4")} key={node.id}>
            <UserCard
              isExpanded={expanded}
              onToggle={() => onToggle(node.id)}
              user={node}
              variant="compact"
            />

            {hasChildren && expanded && (
              <TreeListView
                isExpanded={isExpanded}
                level={level + 1}
                nodes={node.children}
                onToggle={onToggle}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
