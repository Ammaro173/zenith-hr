"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsSummary } from "@/contracts/analytics/schema";
import { formatDate } from "@/lib/format";
import { For, If, Show } from "@/utils";

type AnalyticsSummaryPanelsProps = {
  summary?: AnalyticsSummary;
  loading?: boolean;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function renderSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex logic //TODO:refactor
export function AnalyticsSummaryPanels(props: AnalyticsSummaryPanelsProps) {
  const { summary, loading } = props;

  const interested = summary?.interested;
  const communications = summary?.communications;
  const blocklist = summary?.blocklist;
  const adminOverview = summary?.adminOverview;

  const leadConversion =
    interested?.conversion?.leadToMember !== undefined &&
    interested?.conversion?.leadToMember !== null
      ? percentageFormatter.format(interested.conversion.leadToMember)
      : "—";

  const meanInviteDays =
    interested?.conversion?.meanDaysToInvite !== undefined &&
    interested?.conversion?.meanDaysToInvite !== null
      ? `${interested.conversion.meanDaysToInvite.toFixed(1)} days`
      : "—";

  const lastFailure =
    communications?.lastFailureAt && communications.lastFailureAt !== null
      ? formatDate(communications.lastFailureAt, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  const blockReasons = blocklist?.reasons ?? [];

  return (
    <Show>
      <Show.When isTrue={Boolean(loading)}>{renderSkeleton()}</Show.When>
      <Show.When isTrue={!summary}>{null}</Show.When>
      <Show.Else>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="font-semibold text-base">
                Lead Funnel
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                How leads are progressing across channels.
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invited</span>
                <span className="font-medium">
                  {numberFormatter.format(interested?.totals?.invited ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unblocked</span>
                <span className="font-medium">
                  {numberFormatter.format(interested?.totals?.unblocked ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lead → Member</span>
                <span className="font-medium">{leadConversion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Avg. days to invite
                </span>
                <span className="font-medium">{meanInviteDays}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="font-semibold text-base">
                Communications
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Invitation delivery health.
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failures</span>
                <span className="font-medium">
                  {numberFormatter.format(
                    communications?.invitationFailed ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Re-sent</span>
                <span className="font-medium">
                  {numberFormatter.format(communications?.inviteResent ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg. retries</span>
                <span className="font-medium">
                  {communications?.meanResendCount ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Last failure</span>
                <span className="font-medium text-foreground">
                  {lastFailure}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="font-semibold text-base">
                Blocklist Activity
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Recent blocks and underlying reasons.
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active blocks</span>
                <span className="font-medium">
                  {numberFormatter.format(blocklist?.active ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New this period</span>
                <span className="font-medium">
                  {numberFormatter.format(blocklist?.newBlocks ?? 0)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Top reasons</span>
                <If isTrue={blockReasons.length === 0}>
                  <span className="text-muted-foreground text-xs">
                    No block events captured.
                  </span>
                </If>
                <If isTrue={blockReasons.length > 0}>
                  <ul className="space-y-1 text-xs">
                    <For
                      each={blockReasons}
                      render={(reason) => (
                        <li
                          className="flex justify-between gap-2"
                          key={reason.reason}
                        >
                          <span className="truncate capitalize">
                            {reason.reason.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">
                            {numberFormatter.format(reason.count)}
                          </span>
                        </li>
                      )}
                    />
                  </ul>
                </If>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="font-semibold text-base">
                Admin Coverage
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Team capacity and latest sync.
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active admins</span>
                <span className="font-medium">
                  {numberFormatter.format(adminOverview?.activeAdmins ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New this period</span>
                <span className="font-medium">
                  {numberFormatter.format(adminOverview?.newAdmins ?? 0)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Synced at</span>
                <span className="font-medium">
                  {adminOverview?.lastUpdatedAt
                    ? formatDate(adminOverview.lastUpdatedAt, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Show.Else>
    </Show>
  );
}
