import { User as DBUser, Prisma } from "@prisma/client";

import { env } from "@/env";
import { cache } from "@/lib/cache";

interface ResponseData {
  id: string;
  [key: string]: unknown;
}

/* ACCESS TOKEN AND CACHE RELATED */
export const getKindeAccessToken = async (): Promise<string> => {
  const getCachedAccessToken = cache(
    async () => {
      try {
        console.log("Getting access token from api");
        const response = await callKindeTokenApi();
        const data = response.data;
        const accessToken = data.access_token;
        if (accessToken == undefined || accessToken == null) {
          throw new Error("ACCESS TOKEN NOT FOUND");
        }
        return accessToken;
      } catch (error) {
        throw new Error("ACCESS TOKEN NOT FOUND");
      }
    },
    ["kinde_access_token"],
    { revalidate: 60 * 60 * 12 },
  );

  return await getCachedAccessToken();
};

// function to prepare request and call TOKEN API
export const callKindeTokenApi = async (): Promise<{
  data: {
    access_token: string;
  };
}> => {
  const body = new URLSearchParams({
    audience: env.KINDE_M2M_DOMAIN + "/api",
    grant_type: "client_credentials",
    client_id: env.KINDE_M2M_AUTH_CLIENT_ID,
    client_secret: env.KINDE_M2M_AUTH_CLIENT_SECRET,
  });
  const response = await fetch(`${env.KINDE_M2M_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log("kinde->m2m->response->data", data);
  return { data };
};

/**
 * Creates a new user in Kinde.
 *
 * @example
 * const user = {
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john.doe@example.com',
 *   phone: '1234567890'
 * };
 * const organizationCode = 'org_123';
 * createUserInKinde(user, organizationCode)
 *   .then(id => console.log(`Created user with ID: ${id}`))
 *   .catch(error => console.error(`Failed to create user: ${error}`));
 */
export const createUserInKinde = async (
  user: Prisma.UserCreateInput,
  organizationCode: string,
): Promise<string> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/user`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = {
      profile: {
        given_name: user.firstName,
        family_name: user.lastName,
      },
      organization_code: organizationCode,
      identities: [
        {
          type: "email",
          details: {
            email: user.email,
            username: user.email,
          },
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    const userSub = responseData.id;

    await updateUserRolesInKinde(userSub, (user.roles as string[]) ?? [], []);

    return userSub;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Updates a user in Kinde.
 *
 * @example
 * const user = {
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   tenantId: 'tenant123',
 *   email: 'john.doe@example.com',
 *   phone: '1234567890',
 *   sub: 'user123'
 * };
 * updateUserInKinde(user, true, true)
 *   .then(data => console.log(`Updated user data: ${JSON.stringify(data)}`))
 *   .catch(error => console.error(`Failed to update user: ${error}`));
 */
export const updateUserInKinde = async (
  user: DBUser,
  isSuspended = false,
  isPasswordResetRequested = false,
): Promise<ResponseData> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/user?id=${user.id}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = {
      given_name: user.firstName,
      family_name: user.lastName,
      is_suspended: isSuspended,
      is_password_reset_requested: isPasswordResetRequested,
    };
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();

    // Update user properties in Kinde on User update
    await updateUserPropertiesInKinde(user.id, {
      db_id: user?.id?.toString() ?? "",
      tenant_id: user?.tenantId?.toString() ?? "",
    });

    await updateUserRolesInKinde(user.id, user.roles, []);

    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

export type KindePropertyValueObject = {
  db_id?: string;
  tenant_id?: string;
  user_type?: string;
  parent_id?: string;
};

/**
 * Updates a user properties in Kinde.
 */
export const updateUserPropertiesInKinde = async (
  userSub: string,
  properties: KindePropertyValueObject,
): Promise<any> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/users/${userSub}/properties`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = {
      properties,
    };
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Updates a user roles in Kinde.
 */
export const updateUserRolesInKinde = async (
  userSub: string,
  roles: Array<string>,
  permissions: Array<string>,
): Promise<any> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/organizations/${env.KINDE_DEFAULT_ORG_CODE}/users`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = {
      users: [
        {
          id: userSub,
          operation: "update",
          roles,
          permissions: permissions,
        },
      ],
    };
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Retrieves a user from Kinde by their sub.
 *
 * @example
 * getUserFromKinde('user123')
 *   .then(data => console.log(`User data: ${JSON.stringify(data)}`))
 *   .catch(error => console.error(`Failed to get user: ${error}`));
 */
export const getUserFromKinde = async (sub: string): Promise<ResponseData> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/user?id=${sub}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

export type FindUserInKindeProps = {
  page_size?: number;
  user_id?: string;
  next_token?: string;
  email?: string;
  username?: string;
  expand?: string;
  has_organization?: boolean;
};

/**
 * Find users in Kinde
 */
export const findUsersInKinde = async (
  props: FindUserInKindeProps,
): Promise<ResponseData> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    let url = `${env.KINDE_M2M_DOMAIN}/api/v1/users?`;
    const propKeys = Object.keys(props);
    for (const propKey of propKeys) {
      const propVal = props[propKey];
      url += propKey + "=" + encodeURIComponent(propVal);
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Fetch all roles from kinde
 */
export const getRolesListFromKinde = async (): Promise<any> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/roles?page_size=500`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Fetch all permissions for role from kinde
 */
export const getRolePermissionsFromKinde = async (
  kindeRoleId: string,
): Promise<any> => {
  try {
    const accessToken: string = await getKindeAccessToken();
    const url = `${env.KINDE_M2M_DOMAIN}/api/v1/roles/${kindeRoleId}/permissions?page_size=500`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: ResponseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};

/**
 * Fetch all roles and permissions from kinde
 */
export const getRolesAndPermissionsFromKinde = async (): Promise<any> => {
  const kindeRolesRes = await getRolesListFromKinde();
  if (Array.isArray(kindeRolesRes.roles)) {
    const roleVsPermission: any = {};

    for (let i = 0; i < kindeRolesRes.roles.length; i++) {
      const role: any = kindeRolesRes.roles[i];
      roleVsPermission[role.key] = {
        ...role,
        permissions: [],
      };

      if (role?.id) {
        const kindePermissionsRes = await getRolePermissionsFromKinde(role?.id);
        if (
          kindePermissionsRes.permissions &&
          Array.isArray(kindePermissionsRes.permissions)
        ) {
          roleVsPermission[role.key]["permissions"] =
            kindePermissionsRes.permissions;
        }
      }
    }

    return roleVsPermission;
  }

  throw new Error("Failed to get roles and permissions from Kinde");
};
