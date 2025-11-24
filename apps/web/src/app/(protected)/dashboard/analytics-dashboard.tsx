"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAnalyticsFilterState } from "@/hooks/use-analytics-filter-state";
import { useAnalyticsSummary } from "@/hooks/use-analytics-summary";
import { For, Show } from "@/utils";
import { AnalyticsFilters } from "./components/analytics-filters";
import { AnalyticsFunnels } from "./components/analytics-funnels";
import { AnalyticsStatCard } from "./components/analytics-stat-card";
import { AnalyticsTimeseriesChart } from "./components/analytics-timeseries-chart";

export default function AnalyticsDashboard() {
  const { filters, setFilters, isHr, isRoleLoading, membershipOptions } =
    useAnalyticsFilterState();

  const {
    summary,
    timeseries,
    visibleMembershipTypes,
    isPending,
    isFetching,
    isError,
    refetch,
  } = useAnalyticsSummary({
    filters,
    enabled: !isRoleLoading,
  });

  const loading = isPending || isRoleLoading;
  const fetching = isFetching && !isPending;

  const stats = [
    {
      title: "Pending applications",
      value: summary?.pendingApplications ?? 0,
      description: "Awaiting review or approval.",
    },
    {
      title: "Active members",
      value: summary?.activeMembers ?? 0,
      description: "Currently holding valid passes.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div>
          <h1 className="font-semibold text-3xl text-foreground tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor invitations, activations, and communications across the
            program.
          </p>
        </div>
      </header>

      <AnalyticsFilters
        className="shadow-xs"
        filters={filters}
        isHr={isHr}
        membershipOptions={membershipOptions}
        setFilters={setFilters}
      />

      <Show>
        <Show.When isTrue={isError}>
          <Alert variant="destructive">
            <AlertTitle>Unable to load analytics</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">
                We hit an issue while fetching the latest metrics. Please retry
                in a moment.
              </span>
              <Button
                onClick={() => {
                  refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </Show.When>
      </Show>

      <section className="grid gap-4 sm:grid-cols-2">
        <For
          each={stats}
          render={(stat) => (
            <AnalyticsStatCard
              description={stat.description}
              key={stat.title}
              loading={loading}
              title={stat.title}
              value={stat.value}
            />
          )}
        />
      </section>

      <AnalyticsTimeseriesChart
        data={timeseries}
        error={isError}
        loading={loading || fetching}
        memberships={visibleMembershipTypes}
      />

      <AnalyticsFunnels
        funnels={summary?.funnels}
        loading={loading || fetching}
        memberships={visibleMembershipTypes}
      />

      {/* <AnalyticsSummaryPanels loading={loading || fetching} summary={summary} /> */}
    </div>
  );
}
