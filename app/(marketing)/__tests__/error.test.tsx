import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import Error from "../error";

describe("Error", () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render error message and try again button", () => {
    render(<Error reset={mockReset} />);

    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("should call reset function when try again button is clicked", () => {
    render(<Error reset={mockReset} />);

    const tryAgainButton = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(tryAgainButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should render with proper styling classes", () => {
    render(<Error reset={mockReset} />);

    const container = screen.getByText("Something went wrong!").parentElement;
    expect(container).toHaveClass(
      "flex",
      "min-h-screen",
      "flex-col",
      "items-center",
      "justify-center",
    );
  });
});
