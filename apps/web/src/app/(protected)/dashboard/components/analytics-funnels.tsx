"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsSummary } from "@/contracts/analytics/schema";
import { getMembershipLabel } from "@/hooks/use-analytics-summary";
import { For, If, Show } from "@/utils";

type AnalyticsFunnelsProps = {
  funnels?: AnalyticsSummary["funnels"];
  memberships: readonly string[];
  loading?: boolean;
};

const camelToWordsPattern = /([a-z])([A-Z])/g;
const capitalizeFirstPattern = /^\w/;

const numberFormatter = new Intl.NumberFormat("en-US");

const humanize = (input: string) =>
  input
    .replace(camelToWordsPattern, "$1 $2")
    .replace(capitalizeFirstPattern, (char) => char.toUpperCase());

export function AnalyticsFunnels(props: AnalyticsFunnelsProps) {
  const { funnels, memberships, loading } = props;

  const funnelEntries = memberships.map((membership) => ({
    membership,
    stages: funnels?.[membership] ?? {},
  }));

  const isEmpty =
    !loading &&
    funnelEntries.every(
      (entry) => !entry.stages || Object.keys(entry.stages).length === 0
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-lg">
          Invitation Funnel
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Conversion stages per membership type.
        </p>
      </CardHeader>
      <CardContent>
        <Show>
          <Show.When isTrue={Boolean(loading)}>
            <div className="grid gap-4 md:grid-cols-3">
              <For
                each={[...memberships]}
                render={(membership) => (
                  <Skeleton className="h-28 rounded-lg" key={membership} />
                )}
              />
            </div>
          </Show.When>
          <Show.When isTrue={isEmpty}>
            <div className="flex h-24 flex-col items-center justify-center gap-1 text-muted-foreground text-sm">
              No funnel data available for the selected filters.
            </div>
          </Show.When>
          <Show.Else>
            <div className="grid gap-4 md:grid-cols-3">
              <For
                each={funnelEntries}
                render={({ membership, stages }) => {
                  const stageEntries = Object.entries(stages ?? {});
                  const hasStages = stageEntries.length > 0;

                  return (
                    <div
                      className="rounded-xl border border-border/70 bg-muted/30 p-4"
                      key={membership}
                    >
                      <h3 className="font-medium text-muted-foreground text-sm">
                        {getMembershipLabel(membership)}
                      </h3>
                      <dl className="mt-3 space-y-2">
                        <If isTrue={!hasStages}>
                          <div className="text-muted-foreground text-xs">
                            No recent activity.
                          </div>
                        </If>
                        <If isTrue={hasStages}>
                          <For
                            each={stageEntries}
                            render={([stage, count]) => (
                              <div
                                className="flex items-center justify-between text-sm"
                                key={stage}
                              >
                                <dt className="text-muted-foreground">
                                  {humanize(stage)}
                                </dt>
                                <dd className="font-medium tabular-nums">
                                  {numberFormatter.format(count)}
                                </dd>
                              </div>
                            )}
                          />
                        </If>
                      </dl>
                    </div>
                  );
                }}
              />
            </div>
          </Show.Else>
        </Show>
      </CardContent>
    </Card>
  );
}
