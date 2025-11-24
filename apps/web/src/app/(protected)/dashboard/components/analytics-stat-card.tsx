"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { If, Show } from "@/utils";

type AnalyticsStatCardProps = {
  title: string;
  value: number | null | undefined;
  description?: string;
  loading?: boolean;
  className?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function AnalyticsStatCard(props: AnalyticsStatCardProps) {
  const { title, value, description, loading, className } = props;

  return (
    <Card className={className}>
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="font-medium text-base text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <Show>
          <Show.When isTrue={!!loading}>
            <Skeleton className="h-8 w-20 rounded-md" />
          </Show.When>
          <Show.When isTrue={!loading}>
            <Show>
              <Show.When isTrue={typeof value === "number"}>
                <span className="font-semibold text-3xl tabular-nums">
                  {numberFormatter.format(value as number)}
                </span>
              </Show.When>
              <Show.When isTrue={typeof value !== "number"}>
                <span className="font-semibold text-3xl tabular-nums">
                  {value ?? "—"}
                </span>
              </Show.When>
            </Show>
          </Show.When>
        </Show>
        <If isTrue={!!description}>
          <span className="text-muted-foreground text-sm">{description}</span>
        </If>
      </CardContent>
    </Card>
  );
}
