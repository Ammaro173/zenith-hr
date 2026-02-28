"use client";

import { cn } from "@/lib/utils";
import type { HierarchyNode } from "@/types/users";
import { UserCard } from "./user-card";

interface OrgChartViewProps {
  isExpanded: (nodeId: string) => boolean;
  nodes: HierarchyNode[];
  onToggle: (nodeId: string) => void;
}

function OrgChartNode({
  node,
  isExpanded,
  onToggle,
}: {
  node: HierarchyNode;
  isExpanded: (nodeId: string) => boolean;
  onToggle: (nodeId: string) => void;
}) {
  const expanded = isExpanded(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* User Card */}
      <UserCard
        isExpanded={expanded}
        onToggle={() => onToggle(node.id)}
        user={node}
        variant="chart"
      />

      {/* Connector and Children */}
      {hasChildren && expanded && (
        <>
          {/* Vertical line down from parent */}
          <div className="h-6 w-0.5 bg-border" />

          {/* Children container */}
          <div className="flex flex-nowrap items-start justify-center gap-4">
            {node.children.map((child, index) => (
              <div
                className="relative flex flex-col items-center"
                key={child.id}
              >
                {/* Horizontal Line Connector */}
                {node.children.length > 1 && (
                  <div
                    className={cn(
                      "absolute top-0 h-0.5 bg-border",
                      index === 0 ? "left-1/2" : "-left-2",
                      index === node.children.length - 1
                        ? "right-1/2"
                        : "-right-2",
                    )}
                  />
                )}

                {/* Vertical connector to child */}
                <div className="h-6 w-0.5 bg-border" />

                <OrgChartNode
                  isExpanded={isExpanded}
                  node={child}
                  onToggle={onToggle}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgChartView({
  nodes,
  isExpanded,
  onToggle,
}: OrgChartViewProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-nowrap items-start justify-center gap-8">
      {nodes.map((node) => (
        <OrgChartNode
          isExpanded={isExpanded}
          key={node.id}
          node={node}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
