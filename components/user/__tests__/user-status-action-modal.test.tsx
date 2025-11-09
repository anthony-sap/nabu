import React from "react";
import { StatusEnum, User } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { UserStatusActionModal } from "../user-status-action-modal";

// Mock dependencies
jest.mock("@/actions/users", () => ({
  updateUserStatus: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUpdateUserStatus = require("@/actions/users").updateUserStatus;

describe("UserStatusActionModal", () => {
  const mockUser: User = {
    id: "1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    status: StatusEnum.ENABLE,
    roles: ["USER"],
    tenantId: "tenant1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    emailVerified: null,
    image: null,
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

  it("should render activate button for disabled user", () => {
    const disabledUser = { ...mockUser, status: StatusEnum.DISABLE };
    render(<UserStatusActionModal user={disabledUser} />);

    expect(screen.getByText("Activate")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render deactivate button for enabled user", () => {
    render(<UserStatusActionModal user={mockUser} />);

    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should open dialog when button is clicked", () => {
    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(
      screen.getByText("Are you sure you want to deactivate this user?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Name: John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Email: test@example.com/)).toBeInTheDocument();
  });

  it("should show correct dialog content for activation", () => {
    const disabledUser = { ...mockUser, status: StatusEnum.DISABLE };
    render(<UserStatusActionModal user={disabledUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(
      screen.getByText("Are you sure you want to activate this user?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This action will give the user access to the system/),
    ).toBeInTheDocument();
  });

  it("should show correct dialog content for deactivation", () => {
    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(
      screen.getByText("Are you sure you want to deactivate this user?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This action will prevent the user from logging in to the system/,
      ),
    ).toBeInTheDocument();
  });

  it("should close dialog when cancel is clicked", async () => {
    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Cancel")).toBeInTheDocument();

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Are you sure you want to deactivate this user?"),
      ).not.toBeInTheDocument();
    });
  });

  it("should handle successful user activation", async () => {
    const disabledUser = { ...mockUser, status: StatusEnum.DISABLE };
    mockUpdateUserStatus.mockResolvedValue({ status: StatusEnum.ENABLE });

    render(<UserStatusActionModal user={disabledUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const activateButton = screen.getByRole("button", { name: /activate/i });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith(
        mockUser.id,
        StatusEnum.ENABLE,
      );
      expect(toast.success).toHaveBeenCalledWith("User activated successfully");
    });
  });

  it("should handle successful user deactivation", async () => {
    mockUpdateUserStatus.mockResolvedValue({ status: StatusEnum.DISABLE });

    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const deactivateButton = screen.getByRole("button", {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith(
        mockUser.id,
        StatusEnum.DISABLE,
      );
      expect(toast.success).toHaveBeenCalledWith(
        "User deactivated successfully",
      );
    });
  });

  it("should handle update failure", async () => {
    mockUpdateUserStatus.mockResolvedValue(null);

    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const deactivateButton = screen.getByRole("button", {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith(
        mockUser.id,
        StatusEnum.DISABLE,
      );
      expect(toast.error).toHaveBeenCalledWith("Failed to update user status");
    });
  });

  it("should show loading state during update", async () => {
    mockUpdateUserStatus.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const deactivateButton = screen.getByRole("button", {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButton);

    // After clicking, the button should be disabled and show spinner
    expect(deactivateButton).toBeDisabled();

    // Check that the spinner is visible in the disabled button
    const disabledButton = screen.getByRole("button", { name: "" });
    const spinner = disabledButton.querySelector("svg[class*='animate-spin']");
    expect(spinner).toBeInTheDocument();
  });

  it("should close dialog after successful update", async () => {
    mockUpdateUserStatus.mockResolvedValue({ status: StatusEnum.DISABLE });

    render(<UserStatusActionModal user={mockUser} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const deactivateButton = screen.getByRole("button", {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Are you sure you want to deactivate this user?"),
      ).not.toBeInTheDocument();
    });
  });
});
