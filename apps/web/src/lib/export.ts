import type { Table } from "@tanstack/react-table";

export function exportTableToCSV<TData>(
  table: Table<TData>,
  opts: {
    filename?: string;
    excludeColumns?: (keyof TData | "select" | "actions")[];
    onlySelected?: boolean;
  } = {}
): void {
  const {
    filename = "table",
    excludeColumns = [],
    onlySelected = false,
  } = opts;

  const columnIds = table
    .getAllLeafColumns()
    .map((column) => column.id as keyof TData | "select" | "actions");

  const headers = columnIds.filter((id) => !excludeColumns.includes(id));

  const rows = onlySelected
    ? table.getFilteredSelectedRowModel().rows
    : table.getRowModel().rows;

  const csvRows = rows.map((row, _rowIdx) => {
    const cells = headers.map((header) => {
      const cellValue = row.getValue(header as string);
      return typeof cellValue === "string"
        ? `"${cellValue.replace(/"/g, '""')}"`
        : cellValue;
    });

    return cells.join(",");
  });

  const csvContent = [headers.join(","), ...csvRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
