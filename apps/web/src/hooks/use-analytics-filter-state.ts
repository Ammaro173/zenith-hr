"use client";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo } from "react";
import {
  memberStatusOptions,
  membershipTypeOptions,
} from "@/contracts/member/schema";
import { useCurrentAdmin } from "@/hooks/use-current-admin";

const ARRAY_SEPARATOR = ",";
const camelToWordsPattern = /([a-z])([A-Z])/g;
const capitalizeFirstPattern = /^\w/;
const HR_VISIBLE_MEMBERSHIP_TYPES = ["staff"] as const;

export type AnalyticsFilterState = {
  membershipType: string[];
  status: string[];
  from?: string;
  to?: string;
};

const MEMBERSHIP_OPTIONS: { label: string; value: string }[] = [
  { label: "Q-Auto Staff", value: "staff" },
  { label: "Audi Nardo", value: "nardo" },
  { label: "Audi Ascari", value: "ascari" },
  { label: "Audi Ibis", value: "ibis" },
  { label: "Audi Tango", value: "tango" },
];

const STATUS_OPTIONS: { label: string; value: string }[] =
  memberStatusOptions.map((value) => ({
    value,
    label: value
      .replace(camelToWordsPattern, "$1 $2")
      .replace(capitalizeFirstPattern, (char) => char.toUpperCase()),
  }));

function toArray(value: string | string[] | null | undefined) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function useAnalyticsFilterState() {
  const [rawFilters, setFilters] = useQueryStates({
    membershipType: parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withDefault(
      []
    ),
    status: parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withDefault([]),
    from: parseAsString,
    to: parseAsString,
  });

  const { membershipType, status, from, to } = rawFilters;

  const { role, isLoading: isRoleLoading } = useCurrentAdmin();
  const isHr = role === "HR";

  useEffect(() => {
    if (!isRoleLoading && isHr) {
      const currentMembershipTypes = toArray(membershipType);
      if (
        currentMembershipTypes.length !== HR_VISIBLE_MEMBERSHIP_TYPES.length ||
        !HR_VISIBLE_MEMBERSHIP_TYPES.every((item) =>
          currentMembershipTypes.includes(item)
        )
      ) {
        setFilters({
          membershipType: HR_VISIBLE_MEMBERSHIP_TYPES.slice(),
        });
      }
    }
  }, [isHr, isRoleLoading, membershipType, setFilters]);

  const normalizedMembershipType = useMemo(() => {
    const selected = toArray(membershipType).filter((value) =>
      membershipTypeOptions.includes(
        value as (typeof membershipTypeOptions)[number]
      )
    );
    if (isHr) {
      return HR_VISIBLE_MEMBERSHIP_TYPES.slice();
    }
    return selected;
  }, [isHr, membershipType]);

  const normalizedStatus = useMemo(() => toArray(status), [status]);

  const membershipOptions = useMemo(() => {
    if (isHr) {
      return MEMBERSHIP_OPTIONS.slice(0, 1);
    }
    return MEMBERSHIP_OPTIONS;
  }, [isHr]);

  return {
    filters: {
      membershipType: normalizedMembershipType,
      status: normalizedStatus,
      from: from ?? undefined,
      to: to ?? undefined,
    },
    setFilters,
    isHr,
    isRoleLoading,
    membershipOptions,
  } satisfies {
    filters: AnalyticsFilterState;
    setFilters: typeof setFilters;
    isHr: boolean;
    isRoleLoading: boolean;
    membershipOptions: { label: string; value: string }[];
  };
}

export const analyticsStatusOptions = STATUS_OPTIONS;

export type SetAnalyticsFilters = ReturnType<
  typeof useAnalyticsFilterState
>["setFilters"];
