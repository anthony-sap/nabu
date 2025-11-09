import React, { useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { useDeleteAccountModal } from "../delete-account-modal";

// Mock the Kinde auth hook
jest.mock("@kinde-oss/kinde-auth-nextjs", () => ({
  useKindeAuth: jest.fn(),
}));

// Mock the toast
jest.mock("sonner", () => ({
  toast: {
    promise: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("useDeleteAccountModal", () => {
  const mockUser = {
    given_name: "John",
    family_name: "Doe",
    picture: "https://example.com/avatar.jpg",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKindeAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      text: jest.fn().mockResolvedValue(""),
    });
  });

  it("should render the modal with user information", () => {
    const TestComponent = () => {
      const { DeleteAccountModal, setShowDeleteAccountModal } =
        useDeleteAccountModal();

      useEffect(() => {
        setShowDeleteAccountModal(true);
      }, [setShowDeleteAccountModal]);

      return <DeleteAccountModal />;
    };

    render(<TestComponent />);

    expect(screen.getByText("Delete Account")).toBeInTheDocument();
    expect(screen.getByText(/Warning:/)).toBeInTheDocument();
    expect(
      screen.getByText(/This will permanently delete your account/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/To verify, type/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm delete account" }),
    ).toBeInTheDocument();
  });

  it("should not render when modal is not shown", () => {
    const TestComponent = () => {
      const { DeleteAccountModal } = useDeleteAccountModal();
      return <DeleteAccountModal />;
    };

    render(<TestComponent />);

    expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
  });

  it("should handle form submission with correct verification text", async () => {
    const TestComponent = () => {
      const { DeleteAccountModal, setShowDeleteAccountModal } =
        useDeleteAccountModal();

      useEffect(() => {
        setShowDeleteAccountModal(true);
      }, [setShowDeleteAccountModal]);

      return <DeleteAccountModal />;
    };

    render(<TestComponent />);

    const input = screen.getByLabelText(/To verify, type/);
    const submitButton = screen.getByRole("button", {
      name: "Confirm delete account",
    });

    fireEvent.change(input, { target: { value: "confirm delete account" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  it("should disable button and show loading state during deletion", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ status: 200 }), 100),
        ),
    );

    const TestComponent = () => {
      const { DeleteAccountModal, setShowDeleteAccountModal } =
        useDeleteAccountModal();

      useEffect(() => {
        setShowDeleteAccountModal(true);
      }, [setShowDeleteAccountModal]);

      return <DeleteAccountModal />;
    };

    render(<TestComponent />);

    const input = screen.getByLabelText(/To verify, type/);
    const submitButton = screen.getByRole("button", {
      name: "Confirm delete account",
    });

    fireEvent.change(input, { target: { value: "confirm delete account" } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
