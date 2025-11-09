import React from "react";
import { render, screen } from "@testing-library/react";

import { AuthProvider } from "../auth-provider";

// Mock the KindeProvider from @kinde-oss/kinde-auth-nextjs
jest.mock("@kinde-oss/kinde-auth-nextjs", () => ({
  KindeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="kinde-provider">{children}</div>
  ),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children wrapped in KindeProvider", () => {
    const testChildren = <div data-testid="test-children">Test Content</div>;
    render(<AuthProvider>{testChildren}</AuthProvider>);

    expect(screen.getByTestId("kinde-provider")).toBeInTheDocument();
    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should handle multiple children and complex content", () => {
    const complexChildren = (
      <>
        <h1>Title</h1>
        <p>Paragraph</p>
        <button>Button</button>
      </>
    );
    render(<AuthProvider>{complexChildren}</AuthProvider>);

    expect(screen.getByTestId("kinde-provider")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByText("Button")).toBeInTheDocument();
  });

  it("should handle null children gracefully", () => {
    render(<AuthProvider>{null}</AuthProvider>);
    expect(screen.getByTestId("kinde-provider")).toBeInTheDocument();
  });

  it("should handle undefined children gracefully", () => {
    render(<AuthProvider>{undefined}</AuthProvider>);
    expect(screen.getByTestId("kinde-provider")).toBeInTheDocument();
  });

  it("should update content when children change", () => {
    const { rerender } = render(
      <AuthProvider>
        <div data-testid="initial">Initial Content</div>
      </AuthProvider>,
    );

    expect(screen.getByTestId("initial")).toBeInTheDocument();

    rerender(
      <AuthProvider>
        <div data-testid="updated">Updated Content</div>
      </AuthProvider>,
    );

    expect(screen.queryByTestId("initial")).not.toBeInTheDocument();
    expect(screen.getByTestId("updated")).toBeInTheDocument();
    expect(screen.getByText("Updated Content")).toBeInTheDocument();
  });
});
