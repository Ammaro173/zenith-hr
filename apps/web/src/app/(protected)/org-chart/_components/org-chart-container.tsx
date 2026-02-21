"use client";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Show } from "@/utils/Show";
import {
  type Scope,
  useOrgChart,
  type ViewMode,
} from "../_hooks/use-org-chart";
import { OrgChartView } from "./org-chart-view";
import { TreeListView } from "./tree-list-view";

export function OrgChartContainer() {
  const {
    hierarchy,
    isLoading,
    isFetching,
    scope,
    setScope,
    viewMode,
    setViewMode,
    toggleNode,
    expandAll,
    collapseAll,
    isExpanded,
  } = useOrgChart();

  if (isLoading) {
    return <OrgChartSkeleton />;
  }

  const isEmpty = hierarchy.length === 0;

  const viewModeOptions = [
    {
      label: (
        <div className="flex items-center">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Org Chart
        </div>
      ),
      value: "chart" as ViewMode,
    },
    {
      label: (
        <div className="flex items-center">
          <List className="mr-2 h-4 w-4" />
          Tree List
        </div>
      ),
      value: "tree" as ViewMode,
    },
  ];

  const scopeOptions = [
    {
      label: (
        <div className="flex items-center">
          <Users className="mr-2 h-4 w-4" />
          My Team
        </div>
      ),
      value: "team" as Scope,
    },
    {
      label: (
        <div className="flex items-center">
          <Building2 className="mr-2 h-4 w-4" />
          Organization
        </div>
      ),
      value: "organization" as Scope,
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* View Mode Toggle */}
        <SegmentedControl
          onValueChange={(value) => setViewMode(value as ViewMode)}
          options={viewModeOptions}
          value={viewMode}
        />

        <div className="flex items-center gap-2">
          {/* Scope Toggle */}
          <SegmentedControl
            onValueChange={(value) => setScope(value as Scope)}
            options={scopeOptions}
            value={scope}
          />

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <Button
              disabled={isEmpty}
              onClick={expandAll}
              size="sm"
              title="Expand all"
              variant="outline"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              disabled={isEmpty}
              onClick={collapseAll}
              size="sm"
              title="Collapse all"
              variant="outline"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="relative w-full max-w-full overflow-hidden p-6">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 bg-background/50" />
        )}

        <Show>
          <Show.When isTrue={isEmpty}>
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-lg">No hierarchy data</p>
                <p className="text-muted-foreground text-sm">
                  {scope === "team"
                    ? "You don't have any team members or reports."
                    : "No organizational structure found."}
                </p>
              </div>
            </div>
          </Show.When>

          <Show.When isTrue={viewMode === "chart"}>
            <ScrollArea className="w-full">
              <div className="min-w-max p-4">
                <OrgChartView
                  isExpanded={isExpanded}
                  nodes={hierarchy}
                  onToggle={toggleNode}
                />
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Show.When>

          <Show.Else>
            <div className="max-h-[600px] overflow-y-auto">
              <TreeListView
                isExpanded={isExpanded}
                nodes={hierarchy}
                onToggle={toggleNode}
              />
            </div>
          </Show.Else>
        </Show>
      </Card>
    </div>
  );
}

function OrgChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-100 w-full" />
    </div>
  );
}
