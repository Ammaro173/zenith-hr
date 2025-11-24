"use client";

import { useMemo } from "react";
import type {
  AnalyticsSummary,
  AnalyticsSummaryQuery,
} from "@/contracts/analytics/schema";
import {
  memberStatusOptions,
  membershipTypeOptions,
} from "@/contracts/member/schema";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import type { Prettify } from "@/types/doc";

type AnalyticsFiltersInput = {
  membershipType?: readonly string[];
  status?: readonly string[];
  from?: string;
  to?: string;
};

type AnalyticsFilters = Partial<AnalyticsSummaryQuery>;
type SummaryQueryOptions = Parameters<
  (typeof tsr.analytics.summary)["useQuery"]
>[0];
type SummaryQueryData = Extract<
  NonNullable<SummaryQueryOptions["queryData"]>,
  object
>;

type UseAnalyticsSummaryOptions = {
  filters?: AnalyticsFiltersInput;
  enabled?: boolean;
};

type MembershipKey = (typeof membershipTypeOptions)[number];
type StatusKey = (typeof memberStatusOptions)[number];
type SummaryTimeseriesPoint = {
  date: string;
  label: string;
} & Partial<Record<MembershipKey, number>>;

type AnalyticsSummaryResult = {
  summary: AnalyticsSummary | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
  filters: AnalyticsFiltersInput;
  queryFilters: AnalyticsFilters;
  timeseries: SummaryTimeseriesPoint[];
  visibleMembershipTypes: readonly MembershipKey[];
};

const MEMBERSHIP_TYPE_LABEL_MAP: Record<string, string> = {
  staff: "Q-Auto Staff",
  nardo: "Nardo Grey",
  ascari: "Ascari Blue",
  ibis: "Ibis White",
  tango: "Tango Red",
};

function sanitizeFilters(filters: AnalyticsFiltersInput | undefined) {
  if (!filters) {
    return {};
  }

  const normalized: AnalyticsFilters = {};

  if (filters.from) {
    normalized.from = filters.from;
  }

  if (filters.to) {
    normalized.to = filters.to;
  }

  if (filters.membershipType && filters.membershipType.length > 0) {
    const membershipValues = filters.membershipType.filter(
      (value): value is MembershipKey =>
        membershipTypeOptions.includes(value as MembershipKey)
    );
    if (membershipValues.length > 0) {
      normalized.membershipType =
        membershipValues as AnalyticsSummaryQuery["membershipType"];
    }
  }

  if (filters.status && filters.status.length > 0) {
    const statusValues = filters.status.filter((value): value is StatusKey =>
      memberStatusOptions.includes(value as StatusKey)
    );
    if (statusValues.length > 0) {
      normalized.status = statusValues as AnalyticsSummaryQuery["status"];
    }
  }

  return normalized satisfies AnalyticsFilters;
}

function buildTimeseries(
  summary: AnalyticsSummary | undefined,
  visibleMembershipTypes: readonly MembershipKey[]
) {
  const points = summary?.timeseries?.points ?? [];

  if (!points.length) {
    return [];
  }

  return points.map((point) => {
    const counts = point.counts ?? {};
    const formattedDate = point.date;
    const label = new Date(formattedDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const result: SummaryTimeseriesPoint = {
      date: formattedDate,
      label,
    };

    for (const membership of visibleMembershipTypes) {
      const metrics = (counts as Record<string, { cardsIssued?: number }>)[
        membership
      ];
      result[membership] = metrics?.cardsIssued ?? 0;
    }

    return result;
  });
}

export function useAnalyticsSummary(
  options: UseAnalyticsSummaryOptions = {}
): AnalyticsSummaryResult {
  const { filters, enabled = true } = options;

  const normalizedFilters = useMemo(() => sanitizeFilters(filters), [filters]);

  const queryKey = useMemo(
    () => ["analytics", "summary", normalizedFilters] as const,
    [normalizedFilters]
  );

  const queryData = useMemo<SummaryQueryData | undefined>(() => {
    if (Object.keys(normalizedFilters).length === 0) {
      return;
    }

    return {
      query: normalizedFilters as AnalyticsSummaryQuery,
    };
  }, [normalizedFilters]);

  const queryResult = tsr.analytics.summary.useQuery(
    (queryData
      ? { queryKey, enabled, queryData }
      : { queryKey, enabled }) as SummaryQueryOptions
  ) as ReturnType<(typeof tsr.analytics.summary)["useQuery"]>;

  const response = queryResult.data as
    | {
        body?: AnalyticsSummary;
      }
    | undefined;

  const summary = response?.body;

  const visibleMembershipTypes = useMemo<readonly MembershipKey[]>(() => {
    if (normalizedFilters.membershipType?.length) {
      return normalizedFilters.membershipType;
    }

    if (summary?.meta?.membershipType?.length) {
      return summary.meta.membershipType;
    }

    return membershipTypeOptions;
  }, [normalizedFilters.membershipType, summary?.meta?.membershipType]);

  const timeseries = useMemo(
    () => buildTimeseries(summary, visibleMembershipTypes),
    [summary, visibleMembershipTypes]
  );

  return {
    summary,
    isPending: queryResult.isPending,
    isFetching: queryResult.isFetching,
    isError: queryResult.isError,
    refetch: () => {
      queryResult.refetch();
    },
    filters: (filters ?? {}) as AnalyticsFiltersInput,
    queryFilters: normalizedFilters,
    timeseries,
    visibleMembershipTypes,
  } as Prettify<AnalyticsSummaryResult>;
}

export function getMembershipLabel(key: string) {
  return MEMBERSHIP_TYPE_LABEL_MAP[key] ?? key;
}

export type { SummaryTimeseriesPoint, MembershipKey };
