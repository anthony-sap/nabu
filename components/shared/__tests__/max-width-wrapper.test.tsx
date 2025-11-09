import React from "react";
import { render, screen } from "@testing-library/react";

import MaxWidthWrapper from "../max-width-wrapper";

describe("MaxWidthWrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children content", () => {
    render(
      <MaxWidthWrapper>
        <div data-testid="test-children">Test content</div>
      </MaxWidthWrapper>,
    );
    expect(screen.getByTestId("test-children")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <MaxWidthWrapper className="custom-class">
        <div>Test content</div>
      </MaxWidthWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should use large max width when large prop is true", () => {
    const { container } = render(
      <MaxWidthWrapper large>
        <div>Test content</div>
      </MaxWidthWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("max-w-(--breakpoint-2xl)");
  });

  it("should use default max width when large prop is false", () => {
    const { container } = render(
      <MaxWidthWrapper>
        <div>Test content</div>
      </MaxWidthWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("max-w-6xl");
  });
});
