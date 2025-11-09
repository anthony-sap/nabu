"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTableColumnFilter } from "@/components/shared/data-table-column-filter";
import { DataTableDateRangeFilter } from "@/components/shared/data-table-date-range-filter";

export interface DataTableFiltersProps {
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

export function DataTableFilters({
  columnFilters = [],
  dateRangeFilters = [],
}: DataTableFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Check if there are any search params other than page and pageSize
  const hasActiveFilters = Array.from(searchParams.entries()).some(
    ([key, value]) => key !== "page" && key !== "pageSize" && value,
  );

  // Function to clear all filters except page and pageSize
  const handleResetFilters = () => {
    const params = new URLSearchParams();
    const currentPage = searchParams.get("page");
    const currentPageSize = searchParams.get("pageSize");

    if (currentPage) params.set("page", currentPage);
    if (currentPageSize) params.set("pageSize", currentPageSize);

    router.push(`${pathname}?${params.toString()}`);
  };

  // Function to update URL parameters
  const updateParams = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {columnFilters.map((filter) => {
        const currentValue = searchParams.get(filter.key);
        return (
          <DataTableColumnFilter
            key={filter.key}
            title={filter.title}
            options={filter.options}
            getOptions={filter.getOptions}
            selectedValue={currentValue || undefined}
            searchPlaceholder={filter.searchPlaceholder}
            defaultOption={filter.defaultOption}
            onValueChange={(value) => updateParams(filter.key, value)}
          />
        );
      })}
      {dateRangeFilters.map((filter) => {
        const fromValue = searchParams.get(filter.fromKey);
        const toValue = searchParams.get(filter.toKey);
        return (
          <DataTableDateRangeFilter
            key={`${filter.fromKey}-${filter.toKey}`}
            title={filter.title}
            fromKey={filter.fromKey}
            toKey={filter.toKey}
            fromValue={fromValue || undefined}
            toValue={toValue || undefined}
            onFromChange={(value) => updateParams(filter.fromKey, value)}
            onToChange={(value) => updateParams(filter.toKey, value)}
          />
        );
      })}
      {/* Always reserve space for reset button to prevent layout shifts */}
      <div
        className="ml-auto flex w-[80px] justify-end"
        data-testid="reset-button-container"
      >
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={handleResetFilters}
          >
            Reset
            <X className="ml-2 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
