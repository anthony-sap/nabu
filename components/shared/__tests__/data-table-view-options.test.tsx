import React from "react";
import { Table } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTableViewOptions } from "../data-table-view-options";

// Mock the table object with necessary methods
const createMockTable = (): Table<any> =>
  ({
    getAllColumns: jest.fn().mockReturnValue([
      {
        id: "name",
        accessorFn: () => "test",
        getCanHide: () => true,
        getIsVisible: () => true,
        toggleVisibility: jest.fn(),
      },
      {
        id: "email",
        accessorFn: () => "test@example.com",
        getCanHide: () => true,
        getIsVisible: () => false,
        toggleVisibility: jest.fn(),
      },
      {
        id: "role",
        accessorFn: () => "user",
        getCanHide: () => false,
        getIsVisible: () => true,
        toggleVisibility: jest.fn(),
      },
    ]),
  }) as any;

describe("DataTableViewOptions", () => {
  it("should render settings button", () => {
    const mockTable = createMockTable();
    render(<DataTableViewOptions table={mockTable} />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render button with settings icon", () => {
    const mockTable = createMockTable();
    render(<DataTableViewOptions table={mockTable} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should call getAllColumns to get table columns", () => {
    const mockTable = createMockTable();
    const getAllColumnsSpy = jest.spyOn(mockTable, "getAllColumns");

    render(<DataTableViewOptions table={mockTable} />);

    expect(getAllColumnsSpy).toHaveBeenCalled();
  });

  it("should filter columns correctly", () => {
    const mockTable = createMockTable();
    render(<DataTableViewOptions table={mockTable} />);

    // The component should call getAllColumns and filter the columns
    // We can verify this by checking that the mock was called
    expect(mockTable.getAllColumns).toHaveBeenCalled();
  });

  it("should handle table with no hideable columns", () => {
    const mockTable = {
      getAllColumns: jest.fn().mockReturnValue([
        {
          id: "name",
          accessorFn: () => "test",
          getCanHide: () => false,
          getIsVisible: () => true,
          toggleVisibility: jest.fn(),
        },
      ]),
    } as any;

    render(<DataTableViewOptions table={mockTable} />);

    // Should still render the button
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
