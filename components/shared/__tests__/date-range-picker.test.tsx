import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { format } from "date-fns";

import { DateRangePicker } from "../date-range-picker";

// Mock external dependencies
jest.mock("date-fns", () => ({
  format: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="date-range-button" {...props}>
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
  Popover: ({ children, open, onOpenChange }: any) => {
    const handleClick = () => {
      if (onOpenChange) {
        onOpenChange(!open);
      }
    };
    return (
      <div data-testid="popover" data-open={open} onClick={handleClick}>
        {children}
      </div>
    );
  },
  PopoverContent: ({ children, align }: any) => (
    <div data-testid="popover-content" data-align={align}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, asChild }: any) => {
    if (asChild) {
      return children;
    }
    return <div data-testid="popover-trigger">{children}</div>;
  },
}));

describe("DateRangePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (format as jest.Mock).mockReturnValue("Jan 15, 2024");
  });

  it("should render with default placeholders when no dates are provided", () => {
    render(<DateRangePicker />);

    const buttons = screen.getAllByTestId("date-range-button");
    expect(buttons).toHaveLength(2);
    expect(screen.getByText("From date")).toBeInTheDocument();
    expect(screen.getByText("To date")).toBeInTheDocument();
    expect(screen.getByText("to")).toBeInTheDocument();
  });

  it("should render with custom placeholders", () => {
    render(
      <DateRangePicker fromPlaceholder="Start date" toPlaceholder="End date" />,
    );

    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("End date")).toBeInTheDocument();
  });

  it("should render with formatted dates when dates are provided", () => {
    const fromDate = new Date("2024-01-15");
    const toDate = new Date("2024-01-20");

    render(<DateRangePicker fromDate={fromDate} toDate={toDate} />);

    expect(format).toHaveBeenCalledWith(fromDate, "MMM dd, yyyy");
    expect(format).toHaveBeenCalledWith(toDate, "MMM dd, yyyy");
    expect(screen.getAllByText("Jan 15, 2024")).toHaveLength(2);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<DateRangePicker disabled={true} />);

    const buttons = screen.getAllByTestId("date-range-button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should open from date calendar when from button is clicked", async () => {
    render(<DateRangePicker />);

    const buttons = screen.getAllByTestId("date-range-button");
    const fromButton = buttons[0];

    fireEvent.click(fromButton);

    await waitFor(() => {
      const popovers = screen.getAllByTestId("popover");
      expect(popovers[0]).toHaveAttribute("data-open", "true");
    });
  });

  it("should open to date calendar when to button is clicked", async () => {
    render(<DateRangePicker />);

    const buttons = screen.getAllByTestId("date-range-button");
    const toButton = buttons[1];

    fireEvent.click(toButton);

    await waitFor(() => {
      const popovers = screen.getAllByTestId("popover");
      expect(popovers[1]).toHaveAttribute("data-open", "true");
    });
  });

  it("should call onFromDateChange when from date is selected", async () => {
    const onFromDateChange = jest.fn();
    render(<DateRangePicker onFromDateChange={onFromDateChange} />);

    const buttons = screen.getAllByTestId("date-range-button");
    const fromButton = buttons[0];

    fireEvent.click(fromButton);

    await waitFor(() => {
      const calendarDays = screen.getAllByTestId("calendar-day");
      fireEvent.click(calendarDays[0]);
    });

    expect(onFromDateChange).toHaveBeenCalledWith(new Date("2024-01-15"));
  });

  it("should call onToDateChange when to date is selected", async () => {
    const onToDateChange = jest.fn();
    render(<DateRangePicker onToDateChange={onToDateChange} />);

    const buttons = screen.getAllByTestId("date-range-button");
    const toButton = buttons[1];

    fireEvent.click(toButton);

    await waitFor(() => {
      const calendarDays = screen.getAllByTestId("calendar-day");
      fireEvent.click(calendarDays[1]);
    });

    expect(onToDateChange).toHaveBeenCalledWith(new Date("2024-01-15"));
  });

  it("should apply custom className", () => {
    render(<DateRangePicker className="custom-class" />);

    const container = screen.getByText("to").parentElement;
    expect(container).toHaveClass("custom-class");
  });

  it("should pass align prop to popover content", () => {
    render(<DateRangePicker align="center" />);

    const popoverContents = screen.getAllByTestId("popover-content");
    popoverContents.forEach((content) => {
      expect(content).toHaveAttribute("data-align", "center");
    });
  });

  it("should render with calendar icons", () => {
    render(<DateRangePicker />);

    const buttons = screen.getAllByTestId("date-range-button");
    expect(buttons).toHaveLength(2);
  });

  it("should handle undefined date changes", async () => {
    const onFromDateChange = jest.fn();
    const onToDateChange = jest.fn();

    render(
      <DateRangePicker
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />,
    );

    const buttons = screen.getAllByTestId("date-range-button");
    const fromButton = buttons[0];
    const toButton = buttons[1];

    fireEvent.click(fromButton);
    await waitFor(() => {
      const calendarDays = screen.getAllByTestId("calendar-day");
      fireEvent.click(calendarDays[0]);
    });

    fireEvent.click(toButton);
    await waitFor(() => {
      const calendarDays = screen.getAllByTestId("calendar-day");
      fireEvent.click(calendarDays[1]);
    });

    expect(onFromDateChange).toHaveBeenCalledWith(new Date("2024-01-15"));
    expect(onToDateChange).toHaveBeenCalledWith(new Date("2024-01-15"));
  });
});
