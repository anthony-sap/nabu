import { StatusEnum } from "@prisma/client";

import { prisma } from "@/lib/db";
import { updateUserInKinde } from "@/lib/kinde";
import { getCurrentUser } from "@/lib/session";

export const DELETE = async () => {
  const user = await getCurrentUser();
  if (!user || !user.email || !user.id) {
    throw new Error("Unauthorized");
  }

  try {
    const deletedUser = await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    await updateUserInKinde(deletedUser, true);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("User deleted successfully!", { status: 200 });
};
