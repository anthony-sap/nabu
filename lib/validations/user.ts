import { UserRole } from "@prisma/client";
import * as z from "zod";

export const userNameSchema = z.object({
  firstName: z.string().min(3).max(32),
  lastName: z.string().min(3).max(32),
});

export const userRoleSchema = z.object({
  roles: z.array(z.nativeEnum(UserRole)),
});

export const userCreateSchema = z.object({
  firstName: z.string().min(3).max(32),
  lastName: z.string().min(3).max(32),
  email: z.string().email(),
  roles: z.array(z.nativeEnum(UserRole)).min(1),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(3).max(32),
  lastName: z.string().min(3).max(32),
  email: z.string().email().readonly(),
  roles: z.array(z.nativeEnum(UserRole)).min(1),
});
