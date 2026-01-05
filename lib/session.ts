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
    const sessionStart = Date.now();
    
    const authCheckStart = Date.now();
    const { getUser, getAccessToken, isAuthenticated } =
      getKindeServerSession();
    if (!(await isAuthenticated())) {
      console.log(`[SESSION] isAuthenticated check: ${Date.now() - authCheckStart}ms`);
      console.log(`[SESSION] getCurrentUser: ${Date.now() - sessionStart}ms (not authenticated)`);
      return undefined;
    }
    console.log(`[SESSION] isAuthenticated check: ${Date.now() - authCheckStart}ms`);
    
    const getUserStart = Date.now();
    const user: any = await getUser();
    console.log(`[SESSION] getUser: ${Date.now() - getUserStart}ms`);
    
    if (!user || !user.email) {
      console.log(`[SESSION] getCurrentUser: ${Date.now() - sessionStart}ms (no user/email)`);
      return undefined;
    }
    user["firstName"] = user.given_name;
    user["lastName"] = user.family_name;
    if (user?.properties) {
      for (const propertyKey in USER_PROPERTIES_MAP) {
        const valueKey = USER_PROPERTIES_MAP[propertyKey];
        user[propertyKey] = user?.properties[valueKey] || undefined;
      }
    }
    
    const tokenStart = Date.now();
    const accessToken = await getAccessToken();
    console.log(`[SESSION] getAccessToken: ${Date.now() - tokenStart}ms`);
    
    if (!accessToken) {
      console.log(`[SESSION] getCurrentUser: ${Date.now() - sessionStart}ms (no access token)`);
      return undefined;
    }

    console.log(`[SESSION] getCurrentUser: ${Date.now() - sessionStart}ms (success)`);
    return { ...user, ...accessToken };
  },
);
