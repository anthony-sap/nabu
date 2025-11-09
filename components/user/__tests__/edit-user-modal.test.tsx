import React from "react";
import { User, UserRole } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EditUserModal from "../edit-user-modal";

// Mock the updateUser action
jest.mock("@/actions/users", () => ({
  updateUser: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("EditUserModal", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    image: "https://example.com/avatar.jpg",
    emailVerified: new Date("2024-01-01T12:00:00Z"),
    status: "ENABLE" as any,
    roles: [UserRole.USER],
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

  it("should render the edit button with pen icon and edit text", () => {
    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveClass("w-full");
  });

  it("should open modal when edit button is clicked", () => {
    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByText("Edit user")).toBeInTheDocument();
  });

  it("should display form fields with user data pre-filled", () => {
    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByLabelText("First name")).toHaveValue("John");
    expect(screen.getByLabelText("Last name")).toHaveValue("Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("test@example.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });

  it("should display save and cancel buttons in modal", () => {
    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should handle form submission with updated data", async () => {
    const { updateUser } = require("@/actions/users");
    const { toast } = require("sonner");

    updateUser.mockResolvedValue({ id: "user-123" });

    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    const firstNameInput = screen.getByLabelText("First name");
    const lastNameInput = screen.getByLabelText("Last name");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    fireEvent.change(lastNameInput, { target: { value: "Smith" } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith("user-123", {
        firstName: "Jane",
        lastName: "Smith",
        email: "test@example.com",
        roles: ["USER"],
      });
      expect(toast.success).toHaveBeenCalledWith("User updated successfully");
    });
  });

  it("should show loading state during form submission", async () => {
    const { updateUser } = require("@/actions/users");

    // Create a promise that doesn't resolve immediately
    let resolveUpdateUser: (value: any) => void;
    const updateUserPromise = new Promise((resolve) => {
      resolveUpdateUser = resolve;
    });
    updateUser.mockReturnValue(updateUserPromise);

    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    // Wait for the button to be disabled (loading state)
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });

    // Resolve the promise
    resolveUpdateUser!({ id: "user-123" });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it("should close modal when cancel button is clicked", () => {
    render(<EditUserModal user={mockUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByText("Edit user")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Edit user")).not.toBeInTheDocument();
  });

  it("should handle user with different roles", () => {
    const adminUser = { ...mockUser, roles: [UserRole.ADMIN] };

    render(<EditUserModal user={adminUser} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByLabelText("First name")).toHaveValue("John");
    expect(screen.getByLabelText("Last name")).toHaveValue("Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("test@example.com");
  });

  it("should handle user with missing optional data", () => {
    const userWithMissingData: User = {
      ...mockUser,
      firstName: null,
      lastName: null,
      email: null,
      roles: [] as UserRole[],
    };

    render(<EditUserModal user={userWithMissingData} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByLabelText("First name")).toHaveValue("");
    expect(screen.getByLabelText("Last name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });
});
