import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { For, If } from "@/utils";

interface DataTableSkeletonProps extends React.ComponentProps<"div"> {
  columnCount: number;
  rowCount?: number;
  filterCount?: number;
  cellWidths?: string[];
  withViewOptions?: boolean;
  withPagination?: boolean;
  shrinkZero?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ["auto"],
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, index) => cellWidths[index % cellWidths.length] ?? "auto"
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
      {...props}
    >
      <div className="flex w-full items-center justify-between gap-2 overflow-auto p-1">
        <div className="flex flex-1 items-center gap-2">
          <If isTrue={filterCount > 0}>
            <For
              each={Array.from({ length: filterCount })}
              render={(_, i) => (
                <Skeleton className="h-7 w-2xs border-dashed" key={i} />
              )}
            />
          </If>
        </div>
        <If isTrue={withViewOptions}>
          <Skeleton className="ml-auto hidden h-7 w-2xs lg:flex" />
        </If>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <For
              each={Array.from({ length: 1 })}
              render={(_, i) => (
                <TableRow className="hover:bg-transparent" key={i}>
                  <For
                    each={Array.from({ length: columnCount })}
                    render={(_, j) => (
                      <TableHead
                        key={j}
                        style={{
                          width: cozyCellWidths[j],
                          minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                        }}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableHead>
                    )}
                  />
                </TableRow>
              )}
            />
          </TableHeader>
          <TableBody>
            <For
              each={Array.from({ length: rowCount })}
              render={(_, i) => (
                <TableRow className="hover:bg-transparent" key={i}>
                  <For
                    each={Array.from({ length: columnCount })}
                    render={(_, j) => (
                      <TableCell
                        key={j}
                        style={{
                          width: cozyCellWidths[j],
                          minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                        }}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    )}
                  />
                </TableRow>
              )}
            />
          </TableBody>
        </Table>
      </div>
      <If isTrue={withPagination}>
        <div className="flex w-full items-center justify-between gap-4 overflow-auto p-1 sm:gap-8">
          <Skeleton className="h-7 w-40 shrink-0" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="hidden size-7 lg:block" />
              <Skeleton className="size-7" />
              <Skeleton className="size-7" />
              <Skeleton className="hidden size-7 lg:block" />
            </div>
          </div>
        </div>
      </If>
    </div>
  );
}
