"use client";

import { DateRangePicker } from "./date-range-picker";

export interface DataTableDateRangeFilterProps {
  title: string;
  fromKey: string;
  toKey: string;
  fromValue?: string;
  toValue?: string;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
  className?: string;
}

export function DataTableDateRangeFilter({
  title,
  fromKey,
  toKey,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  className,
}: DataTableDateRangeFilterProps) {
  const fromDate = fromValue ? new Date(fromValue) : undefined;
  const toDate = toValue ? new Date(toValue) : undefined;

  return (
    <DateRangePicker
      fromDate={fromDate}
      toDate={toDate}
      onFromDateChange={(date) => {
        onFromChange(date?.toISOString().split("T")[0]);
      }}
      onToDateChange={(date) => {
        onToChange(date?.toISOString().split("T")[0]);
      }}
      fromPlaceholder="From date"
      toPlaceholder="To date"
      className={className}
      align="start"
    />
  );
}
