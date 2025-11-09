import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { userCreateSchema } from "@/lib/validations/user";

import CreateUserModal from "../create-user-modal";

// Mock external dependencies
jest.mock("@/actions/users", () => ({
  createUser: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CreateUserModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openDialog = () => {
    const triggerButton = screen.getByRole("button", { name: /create user/i });
    fireEvent.click(triggerButton);
  };

  it("should render the create user button with plus icon", () => {
    render(<CreateUserModal />);
    const button = screen.getByRole("button", { name: /create user/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Create User");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("should open dialog and render form when trigger is clicked", () => {
    render(<CreateUserModal />);

    // Initially dialog should be closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Open dialog
    openDialog();

    // Dialog should be present with form
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /create new user/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument(); // Role select
  });

  it("should close dialog when cancel button is clicked", () => {
    render(<CreateUserModal />);
    openDialog();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should handle form field interactions", () => {
    render(<CreateUserModal />);
    openDialog();

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(firstNameInput, { target: { value: "John" } });
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    expect(firstNameInput).toHaveValue("John");
    expect(lastNameInput).toHaveValue("Doe");
    expect(emailInput).toHaveValue("john@example.com");
  });

  it("should render submit and cancel buttons in form", () => {
    render(<CreateUserModal />);
    openDialog();

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should use correct validation schema", () => {
    expect(userCreateSchema.shape.firstName).toBeDefined();
    expect(userCreateSchema.shape.lastName).toBeDefined();
    expect(userCreateSchema.shape.email).toBeDefined();
    expect(userCreateSchema.shape.roles).toBeDefined();
  });

  it("should render without throwing errors", () => {
    expect(() => render(<CreateUserModal />)).not.toThrow();
  });
});
