import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { format } from "date-fns";

import { DatePicker } from "../date-picker";

// Mock external dependencies
jest.mock("date-fns", () => ({
  format: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="date-picker-button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button
        data-testid="calendar-day"
        onClick={() => onSelect(new Date("2024-01-15"))}
      >
        Select Date
      </button>
    </div>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

describe("DatePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (format as jest.Mock).mockReturnValue("January 15, 2024");
  });

  it("should render with placeholder when no date is provided", () => {
    render(<DatePicker />);
    expect(screen.getByTestId("date-picker-button")).toBeInTheDocument();
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });

  it("should render with custom placeholder", () => {
    render(<DatePicker placeholder="Select a date" />);
    expect(screen.getByText("Select a date")).toBeInTheDocument();
  });

  it("should render with formatted date when date is provided", () => {
    const testDate = new Date("2024-01-15");
    render(<DatePicker date={testDate} />);
    expect(format).toHaveBeenCalledWith(testDate, "PPP");
    expect(screen.getByText("January 15, 2024")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<DatePicker disabled={true} />);
    const button = screen.getByTestId("date-picker-button");
    expect(button).toBeDisabled();
  });

  it("should open calendar when button is clicked", async () => {
    render(<DatePicker />);
    const button = screen.getByTestId("date-picker-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("calendar")).toBeInTheDocument();
    });
  });

  it("should call onDateChange when date is selected", async () => {
    const onDateChange = jest.fn();
    render(<DatePicker onDateChange={onDateChange} />);

    const button = screen.getByTestId("date-picker-button");
    fireEvent.click(button);

    await waitFor(() => {
      const calendarDay = screen.getByTestId("calendar-day");
      fireEvent.click(calendarDay);
    });

    expect(onDateChange).toHaveBeenCalledWith(new Date("2024-01-15"));
  });

  it("should apply custom className", () => {
    render(<DatePicker className="custom-class" />);
    const button = screen.getByTestId("date-picker-button");
    expect(button).toHaveClass("custom-class");
  });

  it("should render with calendar icon", () => {
    render(<DatePicker />);
    const button = screen.getByTestId("date-picker-button");
    expect(button).toBeInTheDocument();
  });
});
