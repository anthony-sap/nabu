import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTableFilters } from "../data-table-filters";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

describe("DataTableFilters", () => {
  const mockRouter = {
    push: jest.fn(),
  };
  const mockPathname = "/test";

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
  });

  it("should render without filters", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<DataTableFilters />);

    expect(screen.getByTestId("reset-button-container")).toBeInTheDocument();
  });

  it("should render column filters", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

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

    render(<DataTableFilters columnFilters={columnFilters} />);

    expect(screen.getByText("Filter by Status")).toBeInTheDocument();
  });

  it("should render date range filters", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const dateRangeFilters = [
      {
        title: "Created date",
        fromKey: "createdFrom",
        toKey: "createdTo",
      },
    ];

    render(<DataTableFilters dateRangeFilters={dateRangeFilters} />);

    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
  });

  it("should show reset button when filters are active", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("status", "active");
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);

    render(<DataTableFilters />);

    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("should hide reset button when no filters are active", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<DataTableFilters />);

    expect(
      screen.queryByRole("button", { name: /reset/i }),
    ).not.toBeInTheDocument();
  });

  it("should handle reset filters", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("status", "active");
    searchParams.set("page", "1");
    searchParams.set("pageSize", "10");
    (useSearchParams as jest.Mock).mockReturnValue(searchParams);

    render(<DataTableFilters />);

    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);

    expect(mockRouter.push).toHaveBeenCalledWith("/test?page=1&pageSize=10");
  });
});
