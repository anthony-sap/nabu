import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { StatusEnum, User, UserRole } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { userCreateSchema, userUpdateSchema } from "@/lib/validations/user";

import { UserForm } from "../user-form";

// Mock the Icons component
jest.mock("@/components/shared/icons", () => ({
  Icons: {
    spinner: ({ className }: { className?: string }) => (
      <div data-testid="spinner" className={className}>
        Spinner
      </div>
    ),
  },
}));

// Mock the validation schemas
jest.mock("@/lib/validations/user", () => ({
  userCreateSchema: z.object({
    firstName: z
      .string()
      .min(3, "String must contain at least 3 character(s)")
      .max(32, "String must contain at most 32 character(s)"),
    lastName: z
      .string()
      .min(3, "String must contain at least 3 character(s)")
      .max(32, "String must contain at most 32 character(s)"),
    email: z.string().email("Invalid email"),
    roles: z
      .array(z.nativeEnum(UserRole))
      .min(1, "Array must contain at least 1 element(s)"),
  }),
  userUpdateSchema: z.object({
    firstName: z
      .string()
      .min(3, "String must contain at least 3 character(s)")
      .max(32, "String must contain at most 32 character(s)"),
    lastName: z
      .string()
      .min(3, "String must contain at least 3 character(s)")
      .max(32, "String must contain at most 32 character(s)"),
    email: z.string().email("Invalid email").readonly(),
    roles: z
      .array(z.nativeEnum(UserRole))
      .min(1, "Array must contain at least 1 element(s)"),
  }),
}));

// Test wrapper component that provides form context
const TestWrapper = ({
  user,
  isPending = false,
  onSubmit,
  dialogClose,
}: {
  user?: User;
  isPending?: boolean;
  onSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void;
  dialogClose?: React.ReactNode;
}) => {
  const form = useForm({
    resolver: zodResolver(user ? userUpdateSchema : userCreateSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      roles: user?.roles || [],
    },
  });

  return (
    <UserForm
      user={user}
      form={form}
      isPending={isPending}
      onSubmit={onSubmit}
      dialogClose={dialogClose}
    />
  );
};

describe("UserForm", () => {
  const mockUser: User = {
    id: "1",
    status: StatusEnum.ENABLE,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    emailVerified: null,
    image: null,
    roles: [UserRole.USER],
    tenantId: "tenant-1",
    createdAt: new Date(),
    createdBy: null,
    updatedAt: new Date(),
    updatedBy: null,
    deletedAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render null when no form is provided", () => {
    const { container } = render(<UserForm />);
    expect(container.firstChild).toBeNull();
  });

  it("should render form with all required fields", () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/select a role/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("should render form with user data when user prop is provided", () => {
    render(<TestWrapper user={mockUser} />);

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("john.doe@example.com"),
    ).toBeInTheDocument();
  });

  it("should disable email field when user is provided", () => {
    render(<TestWrapper user={mockUser} />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeDisabled();
  });

  it("should enable email field when no user is provided", () => {
    render(<TestWrapper />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).not.toBeDisabled();
  });

  it("should call onSubmit when form is submitted", async () => {
    const mockOnSubmit = jest.fn((e) => e.preventDefault());
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it("should show spinner when isPending is true", () => {
    render(<TestWrapper isPending={true} />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText(/save changes/i)).not.toBeInTheDocument();
  });

  it("should show 'Save' text on submit button", () => {
    render(<TestWrapper isPending={false} />);
    const submitButton = screen.getByRole("button", { name: /save/i });
    expect(submitButton).toHaveTextContent("Save");
  });

  it("should allow typing in input fields", async () => {
    render(<TestWrapper />);

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(firstNameInput, { target: { value: "Jane" } });
    fireEvent.change(lastNameInput, { target: { value: "Smith" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    expect(firstNameInput).toHaveValue("Jane");
    expect(lastNameInput).toHaveValue("Smith");
    expect(emailInput).toHaveValue("jane@example.com");
  });

  it("should render dialog close element when provided", () => {
    const mockDialogClose = <button data-testid="dialog-close">Close</button>;
    render(<TestWrapper dialogClose={mockDialogClose} />);
    expect(screen.getByTestId("dialog-close")).toBeInTheDocument();
  });

  it("should handle user with null values gracefully", () => {
    const userWithNulls: User = {
      ...mockUser,
      firstName: null,
      lastName: null,
      email: null,
    };

    render(<TestWrapper user={userWithNulls} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  it("should handle empty roles array", () => {
    const userWithNoRoles: User = {
      ...mockUser,
      roles: [],
    };

    render(<TestWrapper user={userWithNoRoles} />);
    expect(screen.getByText(/select a role/i)).toBeInTheDocument();
  });

  it("should render without throwing errors", () => {
    expect(() => render(<TestWrapper />)).not.toThrow();
  });
});
