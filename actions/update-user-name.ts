"use server";

import { revalidatePath } from "next/cache";
import { StatusEnum } from "@prisma/client";

import { prisma } from "@/lib/db";
import { updateUserInKinde } from "@/lib/kinde";
import { getCurrentUser } from "@/lib/session";
import { userNameSchema } from "@/lib/validations/user";

export type FormData = {
  firstName: string;
  lastName: string;
};

export async function updateUserName(userId: string, data: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const { firstName, lastName } = userNameSchema.parse(data);

    // Update the user name.
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName,
        lastName,
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
