import type { Column, Table, TableOptions } from "@tanstack/react-table";
import type { motion } from "motion/react";
import type * as React from "react";
import type { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ExtendedColumnFilter, Option } from "@/types/data-table";

export type EmptyProps<T extends React.ElementType> = Omit<
  React.ComponentProps<T>,
  keyof React.ComponentProps<T>
>;

export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export interface UseDataTableProps<TData>
  extends Required<Pick<TableOptions<TData>, "pageCount">>,
    Pick<
      TableOptions<TData>,
      "data" | "columns" | "getRowId" | "defaultColumn" | "initialState"
    > {
  /**
   * Clear URL query key-value pair when state is set to default.
   * Keep URL meaning consistent when defaults change.
   * @default false
   */
  clearOnDefault?: boolean;

  /**
   * Debounce time (ms) for filter updates to enhance performance during rapid input.
   * @default 500
   */
  debounceMs?: number;

  /**
   * Enable notion like column filters.
   * Advanced filters and column filters cannot be used at the same time.
   * @default false
   * @type boolean
   */
  enableAdvancedFilter?: boolean;
  /**
   * Determines how query updates affect history.
   * `push` creates a new history entry; `replace` (default) updates the current entry.
   * @default "replace"
   */
  history?: "push" | "replace";

  /**
   * Whether the page should scroll to the top when the URL changes.
   * @default false
   */
  scroll?: boolean;

  /**
   * Whether to keep query states client-side, avoiding server calls.
   * Setting to `false` triggers a network request with the updated querystring.
   * @default true
   */
  shallow?: boolean;

  /**
   * Observe Server Component loading states for non-shallow updates.
   * Pass `startTransition` from `React.useTransition()`.
   * Sets `shallow` to `false` automatically.
   * So shallow: true` and `startTransition` cannot be used at the same time.
   * @see https://react.dev/reference/react/useTransition
   */
  startTransition?: React.TransitionStartFunction;

  /**
   * Maximum time (ms) to wait between URL query string updates.
   * Helps with browser rate-limiting. Minimum effective value is 50ms.
   * @default 50
   */
  throttleMs?: number;
}

export interface DataTableProps<TData> extends EmptyProps<"div"> {
  /** The action bar to display above the table. */
  actionBar?: React.ReactNode;
  /** The table instance. */
  table: Table<TData>;
}

export interface DataTableToolbarProps<TData> extends EmptyProps<"div"> {
  /** The table instance. */
  table: Table<TData>;
}

export interface DataTableAdvancedToolbarProps<TData>
  extends EmptyProps<"div"> {
  /** The table instance. */
  table: Table<TData>;
}

export interface DataTableActionBarProps<TData>
  extends EmptyProps<typeof motion.div> {
  /**
   * The container to mount the portal into.
   * @default document.body
   */
  container?: Element | DocumentFragment | null;
  /** The table instance. */
  table: Table<TData>;

  /** Whether the action bar is visible. */
  visible?: boolean;
}

export interface DataTableColumnHeaderProps<TData, TValue>
  extends EmptyProps<typeof DropdownMenuTrigger> {
  /** The column instance. */
  column: Column<TData, TValue>;

  /** The column title. */
  title: string;
}

export interface DataTableDateFilterProps<TData> {
  /** The column instance. */
  column: Column<TData, unknown>;

  /** Whether to enable range selection. */
  multiple?: boolean;

  /** The title of the date picker. */
  title?: string;
}

export interface DataTableFacetedFilterProps<TData, TValue> {
  /** The column instance. */
  column?: Column<TData, TValue>;

  /** Whether to enable multiple selection. */
  multiple?: boolean;

  /** The options of the filter. */
  options: Option[];

  /** The title of the filter. */
  title?: string;
}

export interface DataTableSliderFilterProps<TData> {
  /** The column instance. */
  column: Column<TData, unknown>;

  /** The title of the slider filter. */
  title?: string;
}

export interface DataTableRangeFilterProps<TData> extends EmptyProps<"div"> {
  /** The column instance. */
  column: Column<TData>;
  /** The extended column filter. */
  filter: ExtendedColumnFilter<TData>;

  /** The input id for screen readers. */
  inputId: string;

  /** The function to update the filter. */
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, "filterId">>,
  ) => void;
}

export interface DataTableFilterListProps<TData> {
  /**
   * Debounce time (ms) for filter updates to enhance performance during rapid input.
   * @default 500
   */
  debounceMs?: number;

  /**
   * Whether to keep query states client-side, avoiding server calls.
   * Setting to `false` triggers a network request with the updated querystring.
   * @default true
   */
  shallow?: boolean;
  /** The table instance. */
  table: Table<TData>;

  /**
   * Maximum time (ms) to wait between URL query string updates.
   * Helps with browser rate-limiting. Minimum effective value is 50ms.
   * @default 50
   */
  throttleMs?: number;
}

export interface DataTableFilterMenuProps<TData>
  extends DataTableFilterListProps<TData> {}

export interface DataTableSortListProps<TData>
  extends DataTableFilterListProps<TData> {}

export interface DataTablePaginationProps<TData> extends EmptyProps<"div"> {
  /**
   * The options of the pagination.
   * @default [10, 20, 30, 40, 50]
   */
  pageSizeOptions?: number[];
  /** The table instance. */
  table: Table<TData>;
}

export interface DataTableViewOptionsProps<TData> {
  /** The table instance. */
  table: Table<TData>;
}

export interface DataTableSkeletonProps extends EmptyProps<"div"> {
  /**
   * Array of CSS width values for each table column.
   * The maximum length of the array must match columnCount, extra values will be ignored.
   * @default ["auto"]
   */
  cellWidths?: string[];
  /** The number of columns in the table. */
  columnCount: number;

  /**
   * The number of filters in the table.
   * @default 0
   */
  filterCount?: number;

  /**
   * The number of rows in the table.
   * @default 10
   */
  rowCount?: number;

  /**
   * Whether to prevent the table cells from shrinking.
   * @default false
   */
  shrinkZero?: boolean;

  /**
   * Whether to show the pagination bar.
   * @default true
   */
  withPagination?: boolean;

  /**
   * Whether to show the view options.
   * @default true
   */
  withViewOptions?: boolean;
}
