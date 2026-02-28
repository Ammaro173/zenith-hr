/** biome-ignore-all lint/correctness/noUnusedVariables: biome is dumb */
import type { ColumnSort, Row, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { DataTableConfig } from "@/config/data-table";
import type { FilterItemSchema } from "@/lib/parsers";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    queryKeys?: QueryKeys;
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string;
    expandedContent?: (row: TData) => ReactNode;
    headerClassName?: string;
    headerTitle?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    label?: string;
    options?: Option[];
    placeholder?: string;
    range?: [number, number];
    skeleton?: ReactNode;
    unit?: string;
    variant?: FilterVariant;
  }
}

export interface QueryKeys {
  filters: string;
  joinOperator: string;
  page: string;
  perPage: string;
  sort: string;
}

export interface Option {
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

export type FilterOperator = DataTableConfig["operators"][number];
export type FilterVariant = DataTableConfig["filterVariants"][number];
export type JoinOperator = DataTableConfig["joinOperators"][number];

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: Extract<keyof TData, string>;
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "update" | "delete";
}
