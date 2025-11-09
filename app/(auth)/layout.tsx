import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    if (user.roles?.find((role) => role.key === UserRole.ADMIN)) {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  return <div className="min-h-screen">{children}</div>;
}
