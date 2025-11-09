import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DataTableHeaderSearch } from "../data-table-header-search";

describe("DataTableHeaderSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render search input with placeholder", () => {
    render(<DataTableHeaderSearch />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("should render with initial value when provided", () => {
    render(<DataTableHeaderSearch initialValue="test search" />);
    expect(screen.getByDisplayValue("test search")).toBeInTheDocument();
  });

  it("should update search text when user types", () => {
    render(<DataTableHeaderSearch />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "new search" } });

    expect(screen.getByDisplayValue("new search")).toBeInTheDocument();
  });

  it("should call onChange with debounced value when user types", async () => {
    const mockOnChange = jest.fn();
    render(<DataTableHeaderSearch onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "search term" } });

    await waitFor(
      () => {
        expect(mockOnChange).toHaveBeenCalledWith("search term");
      },
      { timeout: 500 },
    );
  });

  it("should not call onChange when no onChange prop is provided", async () => {
    render(<DataTableHeaderSearch />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "search term" } });

    // Wait a bit to ensure no onChange is called
    await new Promise((resolve) => setTimeout(resolve, 500));

    // No error should occur and component should still work
    expect(screen.getByDisplayValue("search term")).toBeInTheDocument();
  });

  it("should update search text when initialValue prop changes", () => {
    const { rerender } = render(
      <DataTableHeaderSearch initialValue="initial" />,
    );
    expect(screen.getByDisplayValue("initial")).toBeInTheDocument();

    rerender(<DataTableHeaderSearch initialValue="updated" />);
    expect(screen.getByDisplayValue("updated")).toBeInTheDocument();
  });

  it("should handle empty string input", () => {
    const mockOnChange = jest.fn();
    render(<DataTableHeaderSearch onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("should have correct CSS class for max width", () => {
    render(<DataTableHeaderSearch />);
    const input = screen.getByPlaceholderText("Search...");

    expect(input).toHaveClass("max-w-xs");
  });
});
