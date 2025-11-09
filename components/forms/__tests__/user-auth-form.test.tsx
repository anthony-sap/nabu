import React from "react";
import { render, screen } from "@testing-library/react";

import { UserAuthForm } from "../user-auth-form";

// Mock external dependencies
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@kinde-oss/kinde-auth-nextjs", () => ({
  LoginLink: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="login-link">{children}</div>
  ),
}));

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
  }),
}));

describe("UserAuthForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render login button with default state", () => {
    render(<UserAuthForm />);

    expect(
      screen.getByRole("button", { name: /login with kinde/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("login-link")).toBeInTheDocument();
  });

  it("should render with custom className", () => {
    render(<UserAuthForm className="custom-class" />);

    const container = screen.getByTestId("login-link").parentElement;
    expect(container).toHaveClass("custom-class");
  });

  it("should render with additional props", () => {
    render(<UserAuthForm data-testid="auth-form" />);

    const container = screen.getByTestId("login-link").parentElement;
    expect(container).toHaveAttribute("data-testid", "auth-form");
  });

  it("should render logo icon when not loading", () => {
    render(<UserAuthForm />);

    const button = screen.getByRole("button", { name: /login with kinde/i });
    expect(button).toBeEnabled();

    // Check that logo icon is present (not spinner)
    const logoIcon = button.querySelector("svg");
    expect(logoIcon).toBeInTheDocument();
  });

  it("should render button with correct type and variant", () => {
    render(<UserAuthForm />);

    const button = screen.getByRole("button", { name: /login with kinde/i });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("border-input");
  });

  it("should wrap button in LoginLink component", () => {
    render(<UserAuthForm />);

    expect(screen.getByTestId("login-link")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /login with kinde/i });
    expect(screen.getByTestId("login-link")).toContainElement(button);
  });
});
