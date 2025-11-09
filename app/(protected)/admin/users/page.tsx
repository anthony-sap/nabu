import { getUsers, GetUsersProps } from "@/actions/users";

import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { DataTable } from "@/components/shared/data-table";
import CreateUserModal from "@/components/user/create-user-modal";
import { usersColumns } from "@/app/(protected)/admin/users/columns";

export const metadata = constructMetadata({
  title: "Users",
  description: "Manage your users.",
});

export interface UsersPageSearchParams extends GetUsersProps {
  action?: string;
  id?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersPageSearchParams>;
}) {
  const data = await getUsers(await searchParams);

  return (
    <>
      <DashboardHeader heading="Users" text="Manage your users." />
      <DataTable
        columns={usersColumns}
        data={data}
        headerRightAction={<CreateUserModal />}
      />
    </>
  );
}
