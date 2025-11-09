import React from "react";
import { render } from "@testing-library/react";

import { Icons } from "../icons";

describe("Icons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render basic icons", () => {
    const { container } = render(<Icons.add />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should render custom social icons", () => {
    const { container } = render(<Icons.gitHub />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should render all icon types", () => {
    const iconKeys = Object.keys(Icons);
    expect(iconKeys.length).toBeGreaterThan(0);

    // Test a few key icons exist
    expect(Icons.add).toBeDefined();
    expect(Icons.user).toBeDefined();
    expect(Icons.settings).toBeDefined();
  });
});
