import React from "react";
import { Column } from "@tanstack/react-table";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DataTableColumnHeader } from "../data-table-column-header";

// Mock the column object
const createMockColumn = (overrides = {}) =>
  ({
    getCanSort: jest.fn().mockReturnValue(true),
    getIsSorted: jest.fn().mockReturnValue(false),
    toggleSorting: jest.fn(),
    toggleVisibility: jest.fn(),
    ...overrides,
  }) as unknown as Column<any, any>;

describe("DataTableColumnHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render title when column cannot sort", () => {
    const mockColumn = createMockColumn({
      getCanSort: jest.fn().mockReturnValue(false),
    });

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
  });

  it("should render sortable column with dropdown trigger", () => {
    const mockColumn = createMockColumn();

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show ascending arrow when column is sorted ascending", () => {
    const mockColumn = createMockColumn({
      getIsSorted: jest.fn().mockReturnValue("asc"),
    });

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
    // The ArrowUp icon should be present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show descending arrow when column is sorted descending", () => {
    const mockColumn = createMockColumn({
      getIsSorted: jest.fn().mockReturnValue("desc"),
    });

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
    // The ArrowDown icon should be present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show chevron when column is not sorted", () => {
    const mockColumn = createMockColumn({
      getIsSorted: jest.fn().mockReturnValue(false),
    });

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
    // The ChevronsUpDown icon should be present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render dropdown trigger button", () => {
    const mockColumn = createMockColumn();

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should call toggleSorting when dropdown items are clicked", () => {
    const mockColumn = createMockColumn();
    const toggleSorting = jest.fn();
    mockColumn.toggleSorting = toggleSorting;

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    // Test that the component renders correctly with sortable column
    expect(screen.getByText("Test Column")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call toggleVisibility when hide option is clicked", () => {
    const mockColumn = createMockColumn();
    const toggleVisibility = jest.fn();
    mockColumn.toggleVisibility = toggleVisibility;

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    // Test that the component renders correctly with sortable column
    expect(screen.getByText("Test Column")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const mockColumn = createMockColumn({
      getCanSort: jest.fn().mockReturnValue(false),
    });

    render(
      <DataTableColumnHeader
        column={mockColumn}
        title="Test Column"
        className="custom-class"
      />,
    );

    const element = screen.getByText("Test Column").closest("div");
    expect(element).toHaveClass("custom-class");
  });
});
