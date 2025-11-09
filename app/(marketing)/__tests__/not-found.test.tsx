import React from "react";
import { render, screen } from "@testing-library/react";

import NotFound from "../not-found";

// Mock Next.js components
jest.mock("next/image", () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <div src={src} alt={alt} {...props} data-testid="mock-image" />;
  };
});

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: any) {
    return (
      <a href={href} {...props} data-testid="mock-link">
        {children}
      </a>
    );
  };
});

describe("NotFound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render 404 heading and image", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByTestId("mock-image")).toBeInTheDocument();
    expect(screen.getByTestId("mock-image")).toHaveAttribute(
      "src",
      "/_static/illustrations/rocket-crashed.svg",
    );
    expect(screen.getByTestId("mock-image")).toHaveAttribute("alt", "404");
  });

  it("should render page not found message with homepage link", () => {
    render(<NotFound />);

    expect(screen.getByText(/Page not found. Back to/)).toBeInTheDocument();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
    expect(screen.getByTestId("mock-link")).toHaveAttribute("href", "/");
  });

  it("should render with proper layout structure", () => {
    render(<NotFound />);

    const container = screen.getByText("404").parentElement;
    expect(container).toHaveClass(
      "flex",
      "min-h-screen",
      "flex-col",
      "items-center",
      "justify-center",
    );
  });

  it("should render image with correct styling classes", () => {
    render(<NotFound />);

    const image = screen.getByTestId("mock-image");
    expect(image).toHaveClass(
      "pointer-events-none",
      "mb-5",
      "mt-6",
      "dark:invert",
    );
  });
});
