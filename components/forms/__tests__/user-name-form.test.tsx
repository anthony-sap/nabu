import React from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { toast } from "sonner";

import { UserNameForm } from "../user-name-form";

// Mock external dependencies
jest.mock("@kinde-oss/kinde-auth-nextjs");
jest.mock("@/actions/update-user-name", () => ({
  updateUserName: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockRefreshData = jest.fn();
const mockUpdateUserName = jest.fn();
const mockToast = toast as jest.Mocked<typeof toast>;

describe("UserNameForm", () => {
  const mockUser = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKindeAuth as jest.Mock).mockReturnValue({
      refreshData: mockRefreshData,
    });
    mockUpdateUserName.mockResolvedValue({ status: "success" });

    // Mock the updateUserName function
    const { updateUserName } = require("@/actions/update-user-name");
    updateUserName.mockImplementation(mockUpdateUserName);
  });

  it("should render form with user data", () => {
    render(<UserNameForm user={mockUser} />);

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("should render form with empty user data", () => {
    const emptyUser = { id: "user-123", firstName: null, lastName: null };
    render(<UserNameForm user={emptyUser} />);

    const inputs = screen.getAllByDisplayValue("");
    expect(inputs).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("should enable save button when form values change", () => {
    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    expect(saveButton).toBeDisabled();

    act(() => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    });

    expect(saveButton).toBeEnabled();
  });

  it("should handle form submission successfully", async () => {
    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    act(() => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdateUserName).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockRefreshData).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "Your name has been updated.",
      );
    });
  });

  it("should handle form submission error", async () => {
    mockUpdateUserName.mockResolvedValue({ status: "error" });

    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    act(() => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Something went wrong.", {
        description: "Your name was not updated. Please try again.",
      });
    });
  });

  it("should show loading state during submission", async () => {
    let resolvePromise: (value: { status: string }) => void;
    const pendingPromise = new Promise<{ status: string }>((resolve) => {
      resolvePromise = resolve;
    });
    mockUpdateUserName.mockReturnValue(pendingPromise);

    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    act(() => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(saveButton.querySelector(".animate-spin")).toBeInTheDocument();
    });

    await act(async () => {
      resolvePromise!({ status: "success" });
    });
  });

  it("should handle form validation", () => {
    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const lastNameInput = screen.getByDisplayValue("Doe");

    // Test that form renders with validation attributes
    expect(firstNameInput).toHaveAttribute("size", "32");
    expect(lastNameInput).toHaveAttribute("size", "32");
  });

  it("should handle both first and last name changes", () => {
    render(<UserNameForm user={mockUser} />);

    const firstNameInput = screen.getByDisplayValue("John");
    const lastNameInput = screen.getByDisplayValue("Doe");
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    act(() => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
      fireEvent.change(lastNameInput, { target: { value: "Smith" } });
    });

    expect(saveButton).toBeEnabled();
  });
});
