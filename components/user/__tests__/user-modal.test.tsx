import React from "react";
import { User } from "@prisma/client";
import { fireEvent, render, screen } from "@testing-library/react";

import UserModal from "../user-modal";

describe("UserModal", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    image: "https://example.com/avatar.jpg",
    emailVerified: new Date("2024-01-01T12:00:00Z"),
    status: "ENABLE" as any, // Using any to match component's hardcoded status handling
    roles: ["USER"],
    createdAt: new Date("2024-01-01T12:00:00Z"),
    updatedAt: new Date("2024-01-01T12:00:00Z"),
    deletedAt: null,
    tenantId: "tenant-123",
    createdBy: null,
    updatedBy: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the modal trigger button with eye icon and detail text", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveClass("w-full");
  });

  it("should open modal when trigger button is clicked", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("User details")).toBeInTheDocument();
    expect(
      screen.getByText("View user information and data."),
    ).toBeInTheDocument();
  });

  it("should display basic information section with user data", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("Basic information")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("user-123")).toBeInTheDocument();
    expect(screen.getByText("Created at")).toBeInTheDocument();
    expect(screen.getByText("Updated at")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("should display personal information section with user data", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("Personal information")).toBeInTheDocument();
    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Last name")).toBeInTheDocument();
    expect(screen.getByText("Doe")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
  });

  it("should display account information section with user data", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("Account information")).toBeInTheDocument();
    expect(screen.getByText("Email verified")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/avatar.jpg"),
    ).toBeInTheDocument();
  });

  it("should display correct status badge for active user", () => {
    const activeUser = { ...mockUser, status: "ACTIVE" as any };
    render(<UserModal user={activeUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    const activeBadge = screen.getByText("Active");
    expect(activeBadge).toBeInTheDocument();
    expect(activeBadge).toHaveClass("bg-green-500");
  });

  it("should display correct status badge for inactive user", () => {
    const inactiveUser = { ...mockUser, status: "INACTIVE" as any };
    render(<UserModal user={inactiveUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    const inactiveBadge = screen.getByText("Inactive");
    expect(inactiveBadge).toBeInTheDocument();
    expect(inactiveBadge).toHaveClass("bg-secondary");
  });

  it("should display correct status badge for suspended user", () => {
    const suspendedUser = { ...mockUser, status: "SUSPENDED" as any };
    render(<UserModal user={suspendedUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    const suspendedBadge = screen.getByText("Suspended");
    expect(suspendedBadge).toBeInTheDocument();
    expect(suspendedBadge).toHaveClass("bg-destructive");
  });

  it("should display role badges for user roles", () => {
    render(<UserModal user={mockUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("USER")).toBeInTheDocument();
  });

  it("should handle missing user data with fallback values", () => {
    const userWithMissingData: User = {
      ...mockUser,
      firstName: null,
      lastName: null,
      email: null,
      image: null,
      emailVerified: null,
    };

    render(<UserModal user={userWithMissingData} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByText("Last name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("Email verified")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();

    // Check that fallback values are displayed (multiple "-" elements)
    const fallbackElements = screen.getAllByText("-");
    expect(fallbackElements).toHaveLength(4); // firstName, lastName, email, image
  });

  it("should display unknown status with secondary badge variant", () => {
    const unknownStatusUser = { ...mockUser, status: "UNKNOWN" as any };
    render(<UserModal user={unknownStatusUser} />);

    const triggerButton = screen.getByRole("button", { name: /detail/i });
    fireEvent.click(triggerButton);

    const unknownBadge = screen.getByText("UNKNOWN");
    expect(unknownBadge).toBeInTheDocument();
    expect(unknownBadge).toHaveClass("bg-secondary");
  });
});
