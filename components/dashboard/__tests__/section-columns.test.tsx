import React from "react";
import { render, screen } from "@testing-library/react";

import { SectionColumns } from "../section-columns";

describe("SectionColumns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render title", () => {
    render(
      <SectionColumns title="Test Section">
        <div data-testid="test-children">Child content</div>
      </SectionColumns>,
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("should render title and description", () => {
    render(
      <SectionColumns
        title="Test Section"
        description="This is a test description"
      >
        <div data-testid="test-children">Child content</div>
      </SectionColumns>,
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <SectionColumns title="Test Section">
        <div data-testid="test-children">Child content</div>
      </SectionColumns>,
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should render with all props", () => {
    render(
      <SectionColumns
        title="Test Section"
        description="This is a test description"
      >
        <div data-testid="test-children">Child content</div>
      </SectionColumns>,
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
