import React from "react";
import { render, screen } from "@testing-library/react";

import { DashboardHeader } from "../header";

describe("DashboardHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render heading", () => {
    render(<DashboardHeader heading="Dashboard" />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("should render heading and text", () => {
    render(
      <DashboardHeader heading="Dashboard" text="Welcome to your dashboard" />,
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome to your dashboard")).toBeInTheDocument();
  });

  it("should render children when provided", () => {
    render(
      <DashboardHeader heading="Dashboard">
        <button data-testid="test-button">Action</button>
      </DashboardHeader>,
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("test-button")).toBeInTheDocument();
  });

  it("should render heading, text, and children together", () => {
    render(
      <DashboardHeader heading="Dashboard" text="Welcome to your dashboard">
        <button data-testid="test-button">Action</button>
      </DashboardHeader>,
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome to your dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("test-button")).toBeInTheDocument();
  });
});
