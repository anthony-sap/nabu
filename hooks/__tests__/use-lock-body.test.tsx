import React from "react";
import { render } from "@testing-library/react";

import { useLockBody } from "../use-lock-body";

// Mock component to test the hook
const TestComponent = () => {
  useLockBody();
  return <div data-testid="test-component">Test</div>;
};

describe("useLockBody", () => {
  let originalOverflow: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Store original overflow value
    originalOverflow = document.body.style.overflow;
    // Reset body overflow for each test
    document.body.style.overflow = "auto";
  });

  afterEach(() => {
    // Restore original overflow
    document.body.style.overflow = originalOverflow;
  });

  it("should lock body scroll by setting overflow to hidden", () => {
    render(<TestComponent />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should restore original overflow value when component unmounts", () => {
    const { unmount } = render(<TestComponent />);

    // Verify overflow is hidden while component is mounted
    expect(document.body.style.overflow).toBe("hidden");

    // Unmount component
    unmount();

    // Verify overflow is restored to original value
    expect(document.body.style.overflow).toBe("auto");
  });

  it("should preserve original overflow value from getComputedStyle", () => {
    // Set a specific overflow value
    document.body.style.overflow = "scroll";

    const { unmount } = render(<TestComponent />);

    // Verify overflow is hidden while component is mounted
    expect(document.body.style.overflow).toBe("hidden");

    // Unmount component
    unmount();

    // Verify overflow is restored to the original "scroll" value
    expect(document.body.style.overflow).toBe("scroll");
  });
});
