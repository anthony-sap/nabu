"use server";

import { revalidatePath } from "next/cache";
import { Prisma, StatusEnum, User, UserRole } from "@prisma/client";
import { z } from "zod";

import { env } from "@/env";
import { prisma } from "@/lib/db";
import { createUserInKinde, updateUserInKinde } from "@/lib/kinde";
import { getCurrentUser } from "@/lib/session";
import { userCreateSchema } from "@/lib/validations/user";

export interface GetUsersProps {
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface GetUsersResponse extends GetUsersProps {
  items: User[];
  rowCount: number;
}

export const getUsers = async (
  props: GetUsersProps,
): Promise<GetUsersResponse> => {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser.roles?.find((role) => role.key === UserRole.ADMIN)
  ) {
    throw new Error("Unauthorized");
  }

  const page = Number(props?.page) || 1;
  const pageSize = Number(props?.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const where: Prisma.UserWhereInput = props?.query
    ? {
        OR: [
          { id: props.query },
          { firstName: { contains: `%${props.query}%`, mode: "insensitive" } },
          { lastName: { contains: `%${props.query}%`, mode: "insensitive" } },
          { email: { contains: `%${props.query}%`, mode: "insensitive" } },
        ],
      }
    : {};
  const orderBy: Prisma.UserOrderByWithRelationInput = props?.sort
    ? {
        [props.sort.split("-")[0]]:
          props.sort.split("-")[1] === "desc" ? "desc" : "asc",
      }
    : {};
  const items = await prisma.user.findMany({
    take: pageSize,
    skip,
    where,
    orderBy,
  });
  const rowCount = await prisma.user.count({ where });
  return { ...props, rowCount, items };
};

export const getUser = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser.roles?.find((role) => role.key === UserRole.ADMIN)
  ) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const createUser = async (data: z.infer<typeof userCreateSchema>) => {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser.roles?.find((role) => role.key === UserRole.ADMIN)
  ) {
    throw new Error("Unauthorized");
  }

  const validatedData = userCreateSchema.parse(data);

  const sub = await createUserInKinde(
    validatedData,
    env.KINDE_DEFAULT_ORG_CODE,
  );

  const user = await prisma.user.create({
    data: {
      ...validatedData,
      id: sub,
    },
  });

  revalidatePath("/admin/users");
  return user;
};

export const updateUser = async (
  id: string,
  data: z.infer<typeof userCreateSchema>,
) => {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser.roles?.find((role) => role.key === UserRole.ADMIN)
  ) {
    throw new Error("Unauthorized");
  }

  const validatedData = userCreateSchema.parse(data);

  const user = await prisma.user.update({
    where: { id },
    data: validatedData,
  });

  await updateUserInKinde(user, user.status === StatusEnum.DISABLE);

  revalidatePath("/admin/users");
  return user;
};

export const updateUserStatus = async (id: string, status: StatusEnum) => {
  const currentUser = await getCurrentUser();
  if (
    !currentUser ||
    !currentUser.roles?.find((role) => role.key === UserRole.ADMIN)
  ) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status },
  });

  await updateUserInKinde(user, user.status === StatusEnum.DISABLE);

  revalidatePath("/admin/users");
  return user;
};
