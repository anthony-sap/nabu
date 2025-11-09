import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { render, screen } from "@testing-library/react";

import { getCurrentUser } from "@/lib/session";

import AuthLayout from "../layout";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock session
jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

describe("AuthLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children when no user is authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(undefined);

    const { container } = render(
      await AuthLayout({
        children: <div data-testid="test-children">Login Page</div>,
      }),
    );

    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("should redirect admin user to admin page", async () => {
    const mockAdminUser = {
      id: "admin-id",
      email: "admin@test.com",
      firstName: "Admin",
      lastName: "User",
      roles: [{ key: UserRole.ADMIN }],
    };

    mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);

    await AuthLayout({ children: <div>Login Page</div> });

    expect(mockRedirect).toHaveBeenCalledWith("/admin");
  });

  it("should redirect regular user to dashboard", async () => {
    const mockRegularUser = {
      id: "user-id",
      email: "user@test.com",
      firstName: "Regular",
      lastName: "User",
      roles: [{ key: UserRole.USER }],
    };

    mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

    await AuthLayout({ children: <div>Login Page</div> });

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("should redirect user with no roles to dashboard", async () => {
    const mockUserNoRoles = {
      id: "user-id",
      email: "user@test.com",
      firstName: "Regular",
      lastName: "User",
      roles: [],
    };

    mockGetCurrentUser.mockResolvedValue(mockUserNoRoles as any);

    await AuthLayout({ children: <div>Login Page</div> });

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("should redirect user with undefined roles to dashboard", async () => {
    const mockUserUndefinedRoles = {
      id: "user-id",
      email: "user@test.com",
      firstName: "Regular",
      lastName: "User",
      roles: undefined,
    };

    mockGetCurrentUser.mockResolvedValue(mockUserUndefinedRoles as any);

    await AuthLayout({ children: <div>Login Page</div> });

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
