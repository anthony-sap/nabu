import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { DeleteAccountSection } from "../delete-account";

// Mock the modal hook
const mockSetShowDeleteAccountModal = jest.fn();
jest.mock("@/components/modals/delete-account-modal", () => ({
  useDeleteAccountModal: () => ({
    setShowDeleteAccountModal: mockSetShowDeleteAccountModal,
    DeleteAccountModal: () => (
      <div data-testid="delete-account-modal">Modal</div>
    ),
  }),
}));

// Mock the icons
jest.mock("@/components/shared/icons", () => ({
  Icons: {
    close: ({ size, className }: { size: number; className: string }) => (
      <div data-testid="close-icon" className={className}>
        Close
      </div>
    ),
    trash: ({ className }: { className: string }) => (
      <div data-testid="trash-icon" className={className}>
        Trash
      </div>
    ),
  },
}));

describe("DeleteAccountSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render delete account section with title and description", () => {
    render(<DeleteAccountSection />);

    expect(
      screen.getByRole("heading", { name: "Delete Account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This is a danger zone - Be careful !"),
    ).toBeInTheDocument();
  });

  it("should render warning message and delete button", () => {
    render(<DeleteAccountSection />);

    expect(screen.getByText("Are you sure ?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete account/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });

  it("should show active subscription badge when user has paid plan", () => {
    render(<DeleteAccountSection />);

    expect(screen.getByText("Active Subscription")).toBeInTheDocument();
    expect(screen.getByTestId("close-icon")).toBeInTheDocument();
  });

  it("should handle delete button click", () => {
    render(<DeleteAccountSection />);

    const deleteButton = screen.getByRole("button", {
      name: /delete account/i,
    });
    fireEvent.click(deleteButton);

    expect(mockSetShowDeleteAccountModal).toHaveBeenCalledWith(true);
  });

  it("should render delete account modal", () => {
    render(<DeleteAccountSection />);

    expect(screen.getByTestId("delete-account-modal")).toBeInTheDocument();
  });
});
