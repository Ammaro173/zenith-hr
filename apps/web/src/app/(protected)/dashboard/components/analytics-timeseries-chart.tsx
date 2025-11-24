"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMembershipLabel,
  type MembershipKey,
  type SummaryTimeseriesPoint,
} from "@/hooks/use-analytics-summary";

type AnalyticsTimeseriesChartProps = {
  data: SummaryTimeseriesPoint[];
  memberships: readonly MembershipKey[];
  loading?: boolean;
  error?: boolean;
};

const FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function AnalyticsTimeseriesChart(props: AnalyticsTimeseriesChartProps) {
  const { data, memberships, loading, error } = props;

  const chartConfig = useMemo<ChartConfig>(
    () =>
      memberships.reduce<ChartConfig>((acc, membership, index) => {
        acc[membership] = {
          label: getMembershipLabel(membership),
          color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        };
        return acc;
      }, {}),
    [memberships]
  );

  const showEmptyState = !(loading || error) && data.length === 0;

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="font-semibold text-lg">
            Cards Issued Over Time
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Tracking membership pass distribution across the selected segment.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          if (loading) {
            return <Skeleton className="h-[280px] w-full rounded-lg" />;
          }

          if (error) {
            return (
              <div className="flex h-[220px] items-center justify-center rounded-lg border border-destructive/60 border-dashed bg-destructive/10 text-destructive text-sm">
                Unable to load analytics. Please retry shortly.
              </div>
            );
          }

          if (showEmptyState) {
            return (
              <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-border/60 border-dashed bg-muted/20 text-muted-foreground text-sm">
                <span>No activity for the selected filters.</span>
                <span className="text-xs">
                  Adjust membership, status, or date range to see more data.
                </span>
              </div>
            );
          }

          return (
            <ChartContainer
              className="min-h-[280px] w-full"
              config={chartConfig}
            >
              <AreaChart
                accessibilityLayer
                data={data}
                margin={{ left: 8, right: 12, top: 12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(String(value ?? "")).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )
                      }
                      labelKey="date"
                    />
                  }
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  verticalAlign="top"
                />
                {memberships.map((membership, index) => {
                  const fallbackColor =
                    FALLBACK_COLORS[index % FALLBACK_COLORS.length];

                  return (
                    <Area
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      dataKey={membership}
                      dot={false}
                      fill={`var(--color-${membership}, ${fallbackColor})`}
                      fillOpacity={0.28}
                      key={membership}
                      stroke={`var(--color-${membership}, ${fallbackColor})`}
                      strokeWidth={2}
                      type="monotone"
                    />
                  );
                })}
              </AreaChart>
            </ChartContainer>
          );
        })()}
      </CardContent>
    </Card>
  );
}
