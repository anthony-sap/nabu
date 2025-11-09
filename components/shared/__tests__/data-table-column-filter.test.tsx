import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTableColumnFilter } from "../data-table-column-filter";

describe("DataTableColumnFilter", () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with title and placeholder", () => {
    render(
      <DataTableColumnFilter
        title="Status"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText("Filter by Status")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should display selected option when value is provided", () => {
    const options = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    render(
      <DataTableColumnFilter
        title="Status"
        options={options}
        selectedValue="active"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("should open popover and show options when clicked", async () => {
    const options = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    render(
      <DataTableColumnFilter
        title="Status"
        options={options}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should call onValueChange when option is selected", async () => {
    const options = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    render(
      <DataTableColumnFilter
        title="Status"
        options={options}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    const activeOption = screen.getByText("Active");
    await userEvent.click(activeOption);

    expect(mockOnValueChange).toHaveBeenCalledWith("active");
  });

  it("should deselect option when clicked again", async () => {
    const options = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    render(
      <DataTableColumnFilter
        title="Status"
        options={options}
        selectedValue="active"
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    // Find the dropdown option by role and value
    const activeOptions = screen.getAllByText("Active");
    // The dropdown option should have role="option"
    const activeOption = activeOptions.find((el) =>
      el.closest('[role="option"]'),
    );
    await userEvent.click(activeOption!);

    expect(mockOnValueChange).toHaveBeenCalledWith(undefined);
  });

  it("should show empty state when no options match search", async () => {
    const options = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    render(
      <DataTableColumnFilter
        title="Status"
        options={options}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    const searchInput = screen.getByPlaceholderText("Search...");
    await userEvent.type(searchInput, "nonexistent");

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  it("should load dynamic options when getOptions is provided", async () => {
    const mockGetOptions = jest.fn().mockResolvedValue([
      { label: "Dynamic Option 1", value: "dynamic1" },
      { label: "Dynamic Option 2", value: "dynamic2" },
    ]);

    render(
      <DataTableColumnFilter
        title="Dynamic"
        getOptions={mockGetOptions}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockGetOptions).toHaveBeenCalledWith();
    });

    await waitFor(() => {
      expect(screen.getByText("Dynamic Option 1")).toBeInTheDocument();
      expect(screen.getByText("Dynamic Option 2")).toBeInTheDocument();
    });
  });

  it("should search dynamic options when typing", async () => {
    const mockGetOptions = jest
      .fn()
      .mockResolvedValueOnce([{ label: "Initial Option", value: "initial" }])
      .mockResolvedValueOnce([{ label: "Search Result", value: "search" }]);

    render(
      <DataTableColumnFilter
        title="Dynamic"
        getOptions={mockGetOptions}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Initial Option")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search...");
    await userEvent.type(searchInput, "search");

    await waitFor(() => {
      expect(mockGetOptions).toHaveBeenCalledWith("search");
    });
  });

  it("should show loading state when fetching dynamic options", async () => {
    const mockGetOptions = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

    render(
      <DataTableColumnFilter
        title="Dynamic"
        getOptions={mockGetOptions}
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    await userEvent.click(button);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should handle default option when selected value matches", () => {
    const defaultOption = { label: "Default", value: "default" };

    render(
      <DataTableColumnFilter
        title="Status"
        selectedValue="default"
        defaultOption={defaultOption}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(
      <DataTableColumnFilter
        title="Status"
        className="custom-class"
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    expect(button).toHaveClass("custom-class");
  });

  it("should use custom search placeholder", () => {
    render(
      <DataTableColumnFilter
        title="Status"
        searchPlaceholder="Custom search..."
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    fireEvent.click(button);

    expect(screen.getByPlaceholderText("Custom search...")).toBeInTheDocument();
  });

  it("should use custom empty text", () => {
    render(
      <DataTableColumnFilter
        title="Status"
        emptyText="No matches found"
        onValueChange={mockOnValueChange}
      />,
    );

    const button = screen.getByRole("combobox");
    fireEvent.click(button);

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No matches found")).toBeInTheDocument();
  });
});
