import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/header";

export default function UsersLoading() {
  return (
    <>
      <DashboardHeader heading="Users" text="Manage your users." />
      <Skeleton className="size-full rounded-lg" />
    </>
  );
}
