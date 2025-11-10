import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { NabuNav } from "@/components/nabu/nabu-nav";
import { NabuMobileMenu } from "@/components/nabu/nabu-mobile-menu";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

interface NabuLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for the Nabu application section
 * Includes top navigation bar with mode toggle and user account
 */
export default async function NabuLayout({ children }: NabuLayoutProps) {
  const user = await getCurrentUser();

  // Redirect to login if user is not authenticated
  if (!user) redirect("/login");

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* Top navigation header */}
      <header className="bg-background sticky top-0 z-50 flex h-14 border-b px-4 lg:h-[60px] xl:px-8">
        <MaxWidthWrapper className="flex max-w-full items-center justify-between gap-x-3 px-0">
          {/* Left side: Mobile menu + Logo/Brand + Desktop nav */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Mobile menu toggle */}
            <NabuMobileMenu />
            
            {/* Logo/Brand area */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 relative">
              <img src="static/logo.png" alt="Nabu" className="absolute inset-0 m-2 fill-[var(--nabu-mint)]"/>

              </div>
              <span className="font-serif font-bold text-lg">Nabu</span>
            </div>
            
            {/* Desktop navigation links */}
            <div className="hidden md:flex">
              <NabuNav />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <ModeToggle />
            <UserAccountNav />
          </div>
        </MaxWidthWrapper>
      </header>

      {/* Main content area */}
      <main className="flex-1 p-4 xl:px-8">
        <MaxWidthWrapper className="flex h-full max-w-full flex-col px-0">
          {children}
        </MaxWidthWrapper>
      </main>
    </div>
  );
}

