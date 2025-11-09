"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableFilters } from "@/components/shared/data-table-filters";
import { DataTableHeaderSearch } from "@/components/shared/data-table-header-search";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableViewOptions } from "@/components/shared/data-table-view-options";

export interface DataTableData<TData> {
  items: TData[];
  rowCount: number;
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: DataTableData<TData>;
  headerRightAction?: React.ReactNode;
  columnVisibility?: VisibilityState;
  columnFilters?: Array<{
    title: string;
    key: string;
    options?: Array<{ label: string; value: string }>;
    getOptions?: (
      searchQuery?: string,
    ) => Promise<Array<{ label: string; value: string }>>;
    searchPlaceholder?: string;
    defaultOption?: { label: string; value: string };
  }>;
  dateRangeFilters?: Array<{
    title: string;
    fromKey: string;
    toKey: string;
  }>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  headerRightAction,
  columnVisibility: initialColumnVisibility,
  columnFilters = [],
  dateRangeFilters = [],
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility || {
      id: false,
    },
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const table = useReactTable({
    data: data.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    rowCount: data.rowCount,
    onPaginationChange: (updater) => {
      const newPaginationState =
        typeof updater === "function"
          ? updater(table.getState().pagination)
          : updater;
      const params = new URLSearchParams(searchParams);
      params.set("page", (newPaginationState.pageIndex + 1).toString());
      params.set("pageSize", newPaginationState.pageSize.toString());
      router.push(`${pathname}?${params.toString()}`);
    },
    manualSorting: true,
    onSortingChange: (updater) => {
      const newSortingState =
        typeof updater === "function"
          ? updater(table.getState().sorting)
          : updater;
      const params = new URLSearchParams(searchParams);
      params.set(
        "sort",
        newSortingState
          .map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`)
          .join(","),
      );
      router.push(`${pathname}?${params.toString()}`);
    },
    state: {
      columnVisibility,
      pagination: {
        pageIndex: data.page ? data.page - 1 : 0,
        pageSize: data.pageSize || 10,
      },
      sorting: data.sort
        ? data.sort.split(",").map((s) => {
            const [id, desc] = s.split("-");
            return { id, desc: desc === "desc" };
          })
        : [],
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex grow items-center gap-2">
          <DataTableHeaderSearch
            initialValue={data.query}
            onChange={(value) => {
              const params = new URLSearchParams(searchParams);
              params.delete("page");
              if (value === "") {
                params.delete("query");
              } else {
                params.set("query", value);
              }
              router.push(`${pathname}?${params.toString()}`);
            }}
          />
          <DataTableFilters
            columnFilters={columnFilters}
            dateRangeFilters={dateRangeFilters}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <DataTableViewOptions table={table} />
          {headerRightAction}
        </div>
      </div>
      <div className="mb-4 rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
