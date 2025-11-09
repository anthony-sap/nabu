import React from "react";
import { render, screen } from "@testing-library/react";

import MarketingLayout from "../layout";

describe("MarketingLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children content", () => {
    render(
      <MarketingLayout>
        <div data-testid="test-children">Test content</div>
      </MarketingLayout>,
    );

    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("should render with proper layout structure", () => {
    render(
      <MarketingLayout>
        <div>Content</div>
      </MarketingLayout>,
    );

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass("flex-1");
  });

  it("should render without children", () => {
    render(<MarketingLayout>{null}</MarketingLayout>);

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toBeEmptyDOMElement();
  });
});
