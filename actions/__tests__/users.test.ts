import { revalidatePath } from "next/cache";
import { Prisma, StatusEnum, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
// Import mocked modules
import { createUserInKinde, updateUserInKinde } from "@/lib/kinde";
import { getCurrentUser } from "@/lib/session";
import { userCreateSchema } from "@/lib/validations/user";

import {
  createUser,
  getUser,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../users";

// Mock external dependencies
jest.mock("@/lib/kinde", () => ({
  createUserInKinde: jest.fn(),
  updateUserInKinde: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/env", () => ({
  env: {
    KINDE_DEFAULT_ORG_CODE: "test-org-code",
  },
}));

const mockCreateUserInKinde = createUserInKinde as jest.MockedFunction<
  typeof createUserInKinde
>;
const mockUpdateUserInKinde = updateUserInKinde as jest.MockedFunction<
  typeof updateUserInKinde
>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

describe("Users Actions", () => {
  const mockAdminUser = {
    id: "admin-id",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    roles: [{ key: UserRole.ADMIN }],
  };

  const mockRegularUser = {
    id: "user-id",
    email: "user@test.com",
    firstName: "Regular",
    lastName: "User",
    roles: [{ key: UserRole.USER }],
  };

  const mockUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@test.com",
    roles: [UserRole.USER],
  };

  const mockDbUser = {
    id: "user-123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@test.com",
    roles: [UserRole.USER],
    status: StatusEnum.ENABLE,
    tenantId: "tenant-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUsers", () => {
    it("should return users list for admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockDbUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await getUsers({ page: 1, pageSize: 10 });

      expect(result.items).toEqual([mockDbUser]);
      expect(result.rowCount).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {},
        orderBy: {},
      });
    });

    it("should handle search query", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockDbUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await getUsers({ query: "john", page: 1, pageSize: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          OR: [
            { id: "john" },
            { firstName: { contains: "%john%", mode: "insensitive" } },
            { lastName: { contains: "%john%", mode: "insensitive" } },
            { email: { contains: "%john%", mode: "insensitive" } },
          ],
        },
        orderBy: {},
      });
    });

    it("should handle sorting", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockDbUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await getUsers({ sort: "firstName-asc", page: 1, pageSize: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {},
        orderBy: { firstName: "asc" },
      });
    });

    it("should throw error for non-admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

      await expect(getUsers({})).rejects.toThrow("Unauthorized");
    });

    it("should throw error for unauthenticated user", async () => {
      mockGetCurrentUser.mockResolvedValue(undefined);

      await expect(getUsers({})).rejects.toThrow("Unauthorized");
    });
  });

  describe("getUser", () => {
    it("should return user for admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await getUser("user-123");

      expect(result).toEqual(mockDbUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });

    it("should throw error when user not found", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getUser("non-existent")).rejects.toThrow("User not found");
    });

    it("should throw error for non-admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

      await expect(getUser("user-123")).rejects.toThrow("Unauthorized");
    });
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      mockCreateUserInKinde.mockResolvedValue("kinde-user-id");
      (prisma.user.create as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await createUser(mockUserData);

      expect(result).toEqual(mockDbUser);
      expect(mockCreateUserInKinde).toHaveBeenCalledWith(
        mockUserData,
        "test-org-code",
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { ...mockUserData, id: "kinde-user-id" },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users");
    });

    it("should throw error for non-admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

      await expect(createUser(mockUserData)).rejects.toThrow("Unauthorized");
    });

    it("should validate input data", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);

      const invalidData = { ...mockUserData, email: "invalid-email" };

      await expect(createUser(invalidData)).rejects.toThrow();
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockDbUser);
      mockUpdateUserInKinde.mockResolvedValue({} as any);

      const result = await updateUser("user-123", mockUserData);

      expect(result).toEqual(mockDbUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: mockUserData,
      });
      expect(mockUpdateUserInKinde).toHaveBeenCalledWith(mockDbUser, false);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users");
    });

    it("should throw error for non-admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

      await expect(updateUser("user-123", mockUserData)).rejects.toThrow(
        "Unauthorized",
      );
    });
  });

  describe("updateUserStatus", () => {
    it("should update user status to disabled", async () => {
      const disabledUser = { ...mockDbUser, status: StatusEnum.DISABLE };
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.update as jest.Mock).mockResolvedValue(disabledUser);
      mockUpdateUserInKinde.mockResolvedValue({} as any);

      const result = await updateUserStatus("user-123", StatusEnum.DISABLE);

      expect(result).toEqual(disabledUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { status: StatusEnum.DISABLE },
      });
      expect(mockUpdateUserInKinde).toHaveBeenCalledWith(disabledUser, true);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users");
    });

    it("should update user status to active", async () => {
      mockGetCurrentUser.mockResolvedValue(mockAdminUser as any);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockDbUser);
      mockUpdateUserInKinde.mockResolvedValue({} as any);

      const result = await updateUserStatus("user-123", StatusEnum.ENABLE);

      expect(result).toEqual(mockDbUser);
      expect(mockUpdateUserInKinde).toHaveBeenCalledWith(mockDbUser, false);
    });

    it("should throw error for non-admin user", async () => {
      mockGetCurrentUser.mockResolvedValue(mockRegularUser as any);

      await expect(
        updateUserStatus("user-123", StatusEnum.ENABLE),
      ).rejects.toThrow("Unauthorized");
    });
  });
});
