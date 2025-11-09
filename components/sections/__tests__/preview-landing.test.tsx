import React from "react";
import { render, screen } from "@testing-library/react";

import PreviewLanding from "../preview-landing";

describe("PreviewLanding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the preview landing image", () => {
    render(<PreviewLanding />);
    const image = screen.getByAltText("preview landing");
    expect(image).toBeInTheDocument();
  });

  it("should render with proper image attributes", () => {
    render(<PreviewLanding />);
    const image = screen.getByAltText("preview landing");
    expect(image).toHaveAttribute("src");
    // Next.js Image will encode the src as a query param
    expect(image.getAttribute("src")).toContain(
      "url=%2F_static%2Fblog%2Fblog-post-3.jpg",
    );
    expect(image).toHaveAttribute("width", "2000");
    expect(image).toHaveAttribute("height", "1000");
  });
});
