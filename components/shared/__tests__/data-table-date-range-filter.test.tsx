import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTableDateRangeFilter } from "../data-table-date-range-filter";

// Mock the DateRangePicker component
jest.mock("../date-range-picker", () => ({
  DateRangePicker: ({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    fromPlaceholder,
    toPlaceholder,
    className,
    align,
  }: any) => (
    <div data-testid="date-range-picker" className={className}>
      <button
        data-testid="from-date-button"
        onClick={() => onFromDateChange?.(new Date("2024-01-15"))}
      >
        {fromDate ? fromDate.toISOString().split("T")[0] : fromPlaceholder}
      </button>
      <span>to</span>
      <button
        data-testid="to-date-button"
        onClick={() => onToDateChange?.(new Date("2024-01-20"))}
      >
        {toDate ? toDate.toISOString().split("T")[0] : toPlaceholder}
      </button>
    </div>
  ),
}));

describe("DataTableDateRangeFilter", () => {
  const mockOnFromChange = jest.fn();
  const mockOnToChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with default props", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
      />,
    );

    expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    expect(screen.getByTestId("from-date-button")).toBeInTheDocument();
    expect(screen.getByTestId("to-date-button")).toBeInTheDocument();
    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
  });

  it("should render with provided date values", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        fromValue="2024-01-15"
        toValue="2024-01-20"
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
      />,
    );

    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
    expect(screen.getByText("2024-01-20")).toBeInTheDocument();
  });

  it("should handle from date change", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
      />,
    );

    const fromButton = screen.getByTestId("from-date-button");
    fireEvent.click(fromButton);

    expect(mockOnFromChange).toHaveBeenCalledWith("2024-01-15");
  });

  it("should handle to date change", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
      />,
    );

    const toButton = screen.getByTestId("to-date-button");
    fireEvent.click(toButton);

    expect(mockOnToChange).toHaveBeenCalledWith("2024-01-20");
  });

  it("should pass className to DateRangePicker", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
        className="custom-class"
      />,
    );

    const dateRangePicker = screen.getByTestId("date-range-picker");
    expect(dateRangePicker).toHaveClass("custom-class");
  });

  it("should handle undefined date values", () => {
    render(
      <DataTableDateRangeFilter
        title="Date Range"
        fromKey="from"
        toKey="to"
        fromValue={undefined}
        toValue={undefined}
        onFromChange={mockOnFromChange}
        onToChange={mockOnToChange}
      />,
    );

    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
  });
});
