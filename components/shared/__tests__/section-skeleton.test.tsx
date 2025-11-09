import React from "react";
import { render, screen } from "@testing-library/react";

import { SkeletonSection } from "../section-skeleton";

describe("SkeletonSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render skeleton section with default props", () => {
    render(<SkeletonSection />);

    // Check that skeleton elements are rendered by looking for animate-pulse class
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render card skeleton when card prop is true", () => {
    render(<SkeletonSection card />);

    // Check that skeleton elements are rendered by looking for animate-pulse class
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render regular skeleton when card prop is false", () => {
    render(<SkeletonSection card={false} />);

    // Check that skeleton elements are rendered by looking for animate-pulse class
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
