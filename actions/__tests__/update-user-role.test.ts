import { StatusEnum, UserRole } from "@prisma/client";

import { updateUserRole } from "../update-user-role";

// Mock external dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/kinde", () => ({
  updateUserInKinde: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockPrisma = require("@/lib/db").prisma;
const mockUpdateUserInKinde = require("@/lib/kinde").updateUserInKinde;
const mockGetCurrentUser = require("@/lib/session").getCurrentUser;
const mockRevalidatePath = require("next/cache").revalidatePath;

describe("updateUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully update user role and return success status", async () => {
    const userId = "user-123";
    const data = { roles: [UserRole.ADMIN] };
    const mockUser = {
      id: userId,
      status: StatusEnum.ENABLE,
      roles: [UserRole.ADMIN],
    };

    mockGetCurrentUser.mockResolvedValue({ id: "current-user" } as any);
    mockPrisma.user.update.mockResolvedValue(mockUser as any);
    mockUpdateUserInKinde.mockResolvedValue(undefined);

    const result = await updateUserRole(userId, data);

    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { roles: [UserRole.ADMIN] },
    });
    expect(mockUpdateUserInKinde).toHaveBeenCalledWith(mockUser, false);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    expect(result).toEqual({ status: "success" });
  });

  it("should handle disabled user status correctly", async () => {
    const userId = "user-123";
    const data = { roles: [UserRole.USER] };
    const mockUser = {
      id: userId,
      status: StatusEnum.DISABLE,
      roles: [UserRole.USER],
    };

    mockGetCurrentUser.mockResolvedValue({ id: "current-user" } as any);
    mockPrisma.user.update.mockResolvedValue(mockUser as any);
    mockUpdateUserInKinde.mockResolvedValue(undefined);

    const result = await updateUserRole(userId, data);

    expect(mockUpdateUserInKinde).toHaveBeenCalledWith(mockUser, true);
    expect(result).toEqual({ status: "success" });
  });

  it("should return error status when user is not authenticated", async () => {
    const userId = "user-123";
    const data = { roles: [UserRole.USER] };

    mockGetCurrentUser.mockResolvedValue(undefined);

    const result = await updateUserRole(userId, data);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error" });
  });

  it("should return error status when validation fails", async () => {
    const userId = "user-123";
    const data = { roles: ["INVALID_ROLE" as UserRole] };

    mockGetCurrentUser.mockResolvedValue({ id: "current-user" } as any);

    const result = await updateUserRole(userId, data);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error" });
  });

  it("should return error status when database update fails", async () => {
    const userId = "user-123";
    const data = { roles: [UserRole.ADMIN] };

    mockGetCurrentUser.mockResolvedValue({ id: "current-user" } as any);
    mockPrisma.user.update.mockRejectedValue(new Error("Database error"));

    const result = await updateUserRole(userId, data);

    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error" });
  });

  it("should return error status when kinde update fails", async () => {
    const userId = "user-123";
    const data = { roles: [UserRole.USER] };
    const mockUser = {
      id: userId,
      status: StatusEnum.ENABLE,
      roles: [UserRole.USER],
    };

    mockGetCurrentUser.mockResolvedValue({ id: "current-user" } as any);
    mockPrisma.user.update.mockResolvedValue(mockUser as any);
    mockUpdateUserInKinde.mockRejectedValue(new Error("Kinde error"));

    const result = await updateUserRole(userId, data);

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error" });
  });
});
