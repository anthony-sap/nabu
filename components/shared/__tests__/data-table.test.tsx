import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DataTable } from "../data-table";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

const mockSearchParams = new URLSearchParams();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();

Object.defineProperty(mockSearchParams, "get", {
  value: mockGet,
  writable: true,
});
Object.defineProperty(mockSearchParams, "set", {
  value: mockSet,
  writable: true,
});
Object.defineProperty(mockSearchParams, "delete", {
  value: mockDelete,
  writable: true,
});

const mockPathname = "/test";

// Mock child components
jest.mock("@/components/shared/data-table-header-search", () => ({
  DataTableHeaderSearch: ({
    onChange,
    initialValue,
  }: {
    onChange: (value: string) => void;
    initialValue?: string;
  }) => (
    <div data-testid="header-search">
      <input
        data-testid="search-input"
        defaultValue={initialValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
      />
    </div>
  ),
}));

jest.mock("@/components/shared/data-table-pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

jest.mock("@/components/shared/data-table-view-options", () => ({
  DataTableViewOptions: () => <div data-testid="view-options" />,
}));

jest.mock("@/components/shared/data-table-filters", () => ({
  DataTableFilters: () => <div data-testid="filters" />,
}));

describe("DataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
  });

  const mockColumns: ColumnDef<any, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span data-testid={`name-${row.index}`}>{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span data-testid={`email-${row.index}`}>{row.getValue("email")}</span>
      ),
    },
  ];

  const mockData = {
    items: [
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Smith", email: "jane@example.com" },
    ],
    rowCount: 2,
    page: 1,
    pageSize: 10,
  };

  it("should render table with data", () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByTestId("name-0")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("email-0")).toHaveTextContent("john@example.com");
    expect(screen.getByTestId("name-1")).toHaveTextContent("Jane Smith");
    expect(screen.getByTestId("email-1")).toHaveTextContent("jane@example.com");
  });

  it("should render empty state when no data", () => {
    const emptyData = {
      items: [],
      rowCount: 0,
      page: 1,
      pageSize: 10,
    };

    render(<DataTable columns={mockColumns} data={emptyData} />);

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("should render header components", () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    expect(screen.getByTestId("header-search")).toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
    expect(screen.getByTestId("view-options")).toBeInTheDocument();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("should render header right action when provided", () => {
    const headerAction = <button data-testid="header-action">Add New</button>;

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        headerRightAction={headerAction}
      />,
    );

    expect(screen.getByTestId("header-action")).toBeInTheDocument();
    expect(screen.getByText("Add New")).toBeInTheDocument();
  });

  it("should handle search input changes", async () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "test search" } });

    // The search functionality is handled by the DataTableHeaderSearch component
    // We just verify that the input change event works
    expect(searchInput).toHaveValue("test search");
  });

  it("should handle empty search input", async () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "" } });

    // Verify the input is cleared
    expect(searchInput).toHaveValue("");
  });

  it("should handle column filters", () => {
    const columnFilters = [
      {
        title: "Status",
        key: "status",
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
      },
    ];

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        columnFilters={columnFilters}
      />,
    );

    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("should handle date range filters", () => {
    const dateRangeFilters = [
      {
        title: "Created Date",
        fromKey: "createdFrom",
        toKey: "createdTo",
      },
    ];

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        dateRangeFilters={dateRangeFilters}
      />,
    );

    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("should handle initial column visibility", () => {
    const columnVisibility = {
      id: true,
      name: false,
    };

    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        columnVisibility={columnVisibility}
      />,
    );

    expect(screen.getByTestId("view-options")).toBeInTheDocument();
  });

  it("should handle data with query and sort parameters", () => {
    const dataWithParams = {
      ...mockData,
      query: "test query",
      sort: "name-asc,email-desc",
    };

    render(<DataTable columns={mockColumns} data={dataWithParams} />);

    expect(screen.getByTestId("header-search")).toBeInTheDocument();
  });

  it("should pass initial search value to search component", () => {
    const dataWithQuery = {
      ...mockData,
      query: "initial search",
    };

    render(<DataTable columns={mockColumns} data={dataWithQuery} />);

    const searchInput = screen.getByTestId("search-input");
    expect(searchInput).toHaveValue("initial search");
  });
});
