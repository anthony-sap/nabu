import React from "react";
import { Table } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTablePagination } from "../data-table-pagination";

// Mock the table object with necessary methods
const createMockTable = (overrides = {}) => {
  const defaultTable = {
    getState: () => ({
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    }),
    setPageSize: jest.fn(),
    setPageIndex: jest.fn(),
    previousPage: jest.fn(),
    nextPage: jest.fn(),
    getPageCount: () => 5,
    getCanPreviousPage: () => false,
    getCanNextPage: () => true,
  };

  return {
    ...defaultTable,
    ...overrides,
  } as unknown as Table<any>;
};

describe("DataTablePagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render pagination controls", () => {
    const mockTable = createMockTable();
    render(<DataTablePagination table={mockTable} />);

    expect(screen.getByText("Rows per page")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to previous page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to next page/i }),
    ).toBeInTheDocument();
  });

  it("should display current page and total pages", () => {
    const mockTable = createMockTable({
      getState: () => ({
        pagination: {
          pageIndex: 2,
          pageSize: 20,
        },
      }),
      getPageCount: () => 10,
    });

    render(<DataTablePagination table={mockTable} />);

    expect(screen.getByText("Page 3 of 10")).toBeInTheDocument();
  });

  it("should handle page size changes", () => {
    const mockTable = createMockTable();
    const setPageSize = jest.fn();
    mockTable.setPageSize = setPageSize;

    render(<DataTablePagination table={mockTable} />);

    const select = screen.getByRole("combobox");
    fireEvent.click(select);

    const option25 = screen.getByText("25");
    fireEvent.click(option25);

    expect(setPageSize).toHaveBeenCalledWith(25);
  });

  it("should handle previous page navigation", () => {
    const mockTable = createMockTable({
      getCanPreviousPage: () => true,
    });
    const previousPage = jest.fn();
    mockTable.previousPage = previousPage;

    render(<DataTablePagination table={mockTable} />);

    const prevButton = screen.getByRole("button", {
      name: /go to previous page/i,
    });
    fireEvent.click(prevButton);

    expect(previousPage).toHaveBeenCalled();
  });

  it("should handle next page navigation", () => {
    const mockTable = createMockTable();
    const nextPage = jest.fn();
    mockTable.nextPage = nextPage;

    render(<DataTablePagination table={mockTable} />);

    const nextButton = screen.getByRole("button", { name: /go to next page/i });
    fireEvent.click(nextButton);

    expect(nextPage).toHaveBeenCalled();
  });

  it("should handle first page navigation", () => {
    const mockTable = createMockTable({
      getCanPreviousPage: () => true,
    });
    const setPageIndex = jest.fn();
    mockTable.setPageIndex = setPageIndex;

    render(<DataTablePagination table={mockTable} />);

    const firstPageButton = screen.getByRole("button", {
      name: /go to first page/i,
    });
    fireEvent.click(firstPageButton);

    expect(setPageIndex).toHaveBeenCalledWith(0);
  });

  it("should handle last page navigation", () => {
    const mockTable = createMockTable({
      getPageCount: () => 10,
    });
    const setPageIndex = jest.fn();
    mockTable.setPageIndex = setPageIndex;

    render(<DataTablePagination table={mockTable} />);

    const lastPageButton = screen.getByRole("button", {
      name: /go to last page/i,
    });
    fireEvent.click(lastPageButton);

    expect(setPageIndex).toHaveBeenCalledWith(9);
  });

  it("should disable previous buttons when on first page", () => {
    const mockTable = createMockTable({
      getCanPreviousPage: () => false,
    });

    render(<DataTablePagination table={mockTable} />);

    const prevButton = screen.getByRole("button", {
      name: /go to previous page/i,
    });
    const firstPageButton = screen.getByRole("button", {
      name: /go to first page/i,
    });

    expect(prevButton).toBeDisabled();
    expect(firstPageButton).toBeDisabled();
  });

  it("should disable next buttons when on last page", () => {
    const mockTable = createMockTable({
      getCanNextPage: () => false,
    });

    render(<DataTablePagination table={mockTable} />);

    const nextButton = screen.getByRole("button", { name: /go to next page/i });
    const lastPageButton = screen.getByRole("button", {
      name: /go to last page/i,
    });

    expect(nextButton).toBeDisabled();
    expect(lastPageButton).toBeDisabled();
  });

  it("should show correct page size options", () => {
    const mockTable = createMockTable();

    render(<DataTablePagination table={mockTable} />);

    const select = screen.getByRole("combobox");
    fireEvent.click(select);

    // Check that all expected page size options are available in the dropdown
    const options = screen.getAllByRole("option");
    const optionValues = options.map((option) => option.textContent);

    expect(optionValues).toContain("10");
    expect(optionValues).toContain("20");
    expect(optionValues).toContain("25");
    expect(optionValues).toContain("30");
    expect(optionValues).toContain("40");
    expect(optionValues).toContain("50");
  });
});
