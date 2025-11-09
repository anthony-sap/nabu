"use server";

import { revalidatePath } from "next/cache";
import { StatusEnum, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { updateUserInKinde } from "@/lib/kinde";
import { getCurrentUser } from "@/lib/session";
import { userRoleSchema } from "@/lib/validations/user";

export type FormData = {
  roles: UserRole[];
};

export async function updateUserRole(userId: string, data: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const { roles } = userRoleSchema.parse(data);

    // Update the user role.
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        roles,
      },
    });

    await updateUserInKinde(user, user.status === StatusEnum.DISABLE);

    revalidatePath("/dashboard/settings");
    return { status: "success" };
  } catch (error) {
    // console.log(error)
    return { status: "error" };
  }
}
