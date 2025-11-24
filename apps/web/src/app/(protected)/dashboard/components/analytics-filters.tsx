"use client";

import { Calendar as CalendarIcon, FilterX } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from "@/components/ui/faceted";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  type AnalyticsFilterState,
  analyticsStatusOptions,
  type SetAnalyticsFilters,
} from "@/hooks/use-analytics-filter-state";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type AnalyticsFiltersProps = {
  filters: AnalyticsFilterState;
  setFilters: SetAnalyticsFilters;
  membershipOptions: { label: string; value: string }[];
  isHr: boolean;
  className?: string;
};

export function AnalyticsFilters(props: AnalyticsFiltersProps) {
  const { filters, setFilters, membershipOptions, isHr, className } = props;

  const membershipSegments = useMemo(() => {
    const segments = membershipOptions.map((option) => ({
      label: option.label,
      value: option.value,
    }));

    if (isHr) {
      return segments;
    }

    return [{ label: "All", value: "all" }, ...segments];
  }, [membershipOptions, isHr]);

  const currentMembership = useMemo(() => {
    if (isHr) {
      return "staff";
    }
    if (!filters.membershipType.length) {
      return "all";
    }
    return filters.membershipType[0];
  }, [filters.membershipType, isHr]);

  const onMembershipChange = useCallback(
    (value: string) => {
      if (isHr) {
        return;
      }
      if (value === "all") {
        setFilters({ membershipType: [] });
        return;
      }

      setFilters({ membershipType: [value] });
    },
    [isHr, setFilters]
  );

  const onStatusChange = useCallback(
    (values?: string[]) => {
      setFilters({ status: values ?? [] });
    },
    [setFilters]
  );

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = filters.from ? new Date(filters.from) : undefined;
    const to = filters.to ? new Date(filters.to) : undefined;

    if (!(from || to)) {
      return;
    }

    return { from, to };
  }, [filters.from, filters.to]);

  const onDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      const fromIso = range?.from ? range.from.toISOString() : undefined;
      const toIso = range?.to ? range.to.toISOString() : undefined;
      setFilters({ from: fromIso, to: toIso });
    },
    [setFilters]
  );

  const onResetFilters = useCallback(() => {
    setFilters({
      status: [],
      from: null,
      to: null,
    });
  }, [setFilters]);

  const dateLabel = useMemo(() => {
    if (!(selectedRange?.from || selectedRange?.to)) {
      return "Last 30 days";
    }
    if (selectedRange.from && selectedRange.to) {
      return `${formatDate(selectedRange.from, {
        month: "short",
        day: "numeric",
      })} - ${formatDate(selectedRange.to, {
        month: "short",
        day: "numeric",
      })}`;
    }
    return formatDate(selectedRange.from ?? selectedRange.to, {
      month: "short",
      day: "numeric",
    });
  }, [selectedRange]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-3 sm:p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-muted-foreground text-sm">
          Membership
        </span>
        <SegmentedControl
          className={cn("w-fit justify-start")}
          onValueChange={onMembershipChange}
          options={membershipSegments as { label: string; value: string }[]}
          value={currentMembership}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Faceted multiple onValueChange={onStatusChange} value={filters.status}>
          <FacetedTrigger asChild>
            <Button
              className="h-9 min-w-[180px] justify-start rounded-md border border-border/70 pr-2 pl-3 font-normal"
              variant="outline"
            >
              <FacetedBadgeList
                badgeClassName="px-2"
                max={3}
                options={analyticsStatusOptions}
                placeholder="Statuses"
              />
            </Button>
          </FacetedTrigger>
          <FacetedContent className="w-[220px]">
            <FacetedInput placeholder="Search statuses" />
            <FacetedList>
              <FacetedEmpty>No statuses found.</FacetedEmpty>
              <FacetedGroup>
                {analyticsStatusOptions.map((option) => (
                  <FacetedItem key={option.value} value={option.value}>
                    <span>{option.label}</span>
                  </FacetedItem>
                ))}
              </FacetedGroup>
            </FacetedList>
          </FacetedContent>
        </Faceted>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="h-9 min-w-[200px] justify-start gap-2 rounded-md border border-border/70 pr-2 pl-3 font-normal"
              variant="outline"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span className="truncate">{dateLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
            <Calendar
              defaultMonth={selectedRange?.from}
              initialFocus
              mode="range"
              numberOfMonths={2}
              onSelect={onDateRangeChange}
              selected={selectedRange}
            />
          </PopoverContent>
        </Popover>

        <Button
          className="ml-auto gap-2"
          onClick={onResetFilters}
          size="sm"
          type="button"
          variant="ghost"
        >
          <FilterX className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
