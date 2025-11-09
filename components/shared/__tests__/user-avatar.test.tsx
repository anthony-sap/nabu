import React from "react";
import { render, screen } from "@testing-library/react";

import { UserAvatar } from "../user-avatar";

describe("UserAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render avatar component", () => {
    const user = {
      firstName: "John",
      lastName: "Doe",
      image: "https://example.com/avatar.jpg",
    };

    render(<UserAvatar user={user} />);
    // Check that the avatar container is rendered
    const avatarContainer = document.querySelector(
      ".relative.flex.size-10.shrink-0.overflow-hidden.rounded-full",
    );
    expect(avatarContainer).toBeInTheDocument();
  });

  it("should render fallback text for screen readers", () => {
    const user = {
      firstName: "Jane",
      lastName: "Smith",
      image: null,
    };

    render(<UserAvatar user={user} />);
    // Check that the screen reader text is present
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const user = {
      firstName: "Alice",
      lastName: "Johnson",
      image: "https://example.com/alice.jpg",
    };

    render(<UserAvatar user={user} className="custom-class" />);
    const avatarContainer = document.querySelector(
      ".relative.flex.size-10.shrink-0.overflow-hidden.rounded-full.custom-class",
    );
    expect(avatarContainer).toBeInTheDocument();
  });
});
