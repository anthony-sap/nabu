import "server-only";

import { cache } from "react";
import { KindeAccessToken, KindeUser } from "@kinde-oss/kinde-auth-nextjs";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const USER_PROPERTIES_MAP = {
  tenantId: "tenant_id",
  dbId: "db_id",
};

export interface CurrentUser extends KindeUser, KindeAccessToken {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  dbId: string;
  
}

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | undefined> => {
    const { getUser, getAccessToken, isAuthenticated } =
      getKindeServerSession();
    if (!(await isAuthenticated())) {
      return undefined;
    }
    const user: any = await getUser();
    if (!user || !user.email) {
      return undefined;
    }
    console.log(user)
    user["firstName"] = user.given_name;
    user["lastName"] = user.family_name;
    if (user?.properties) {
      for (const propertyKey in USER_PROPERTIES_MAP) {
        const valueKey = USER_PROPERTIES_MAP[propertyKey];
        user[propertyKey] = user?.properties[valueKey] || undefined;
      }
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return undefined;
    }

    return { ...user, ...accessToken };
  },
);
