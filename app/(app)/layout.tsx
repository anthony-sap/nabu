import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { QuickThoughtProvider } from "@/components/nabu/quick-thought-context";
import { QuickThoughtManager } from "@/components/nabu/quick-thought-manager";
import { QueryProvider } from "@/components/providers/query-provider";
import { AppShell } from "@/components/nabu/app-shell";

interface NabuLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for the Nabu application section
 * 
 * Three-Layer Visual Physics:
 * 1. Canvas: Solid base (Slate 50 light / Nabu Deep dark)
 * 2. Atmosphere: Blurred Mint & Lapis orbs for ambient light
 * 3. Lens: Glass sidebar catches and diffuses the atmosphere
 */
export default async function NabuLayout({ children }: NabuLayoutProps) {
  const user = await getCurrentUser();

  // Redirect to login if user is not authenticated
  if (!user) redirect("/login");

  return (
    <QueryProvider>
      <QuickThoughtProvider>
        {/* Background Container - Matching Prototype */}
        <div className="w-full h-screen overflow-hidden relative font-sans text-nabu-deep dark:text-white selection:bg-nabu-mint/30 transition-colors duration-300 bg-[#F8FAFC] dark:bg-[#071633]">
          
          {/* Atmosphere Orb 1: Mint - Top Left */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-nabu-mint/10 dark:bg-nabu-mint/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-opacity duration-500" />
          
          {/* Atmosphere Orb 2: Lapis - Bottom Left */}
          <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-nabu-lapis/5 dark:bg-nabu-lapis/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-opacity duration-500" />
          
          {/* Atmosphere Orb 3: Mint - Top Right */}
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-nabu-mint/5 dark:bg-nabu-mint/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500" />

          {/* App Content - Relative z-10 */}
          <div className="flex w-full h-full relative z-10">
            <AppShell>
              {children}
            </AppShell>
          </div>

          {/* Quick Thought Manager - handles all modals and minimized thoughts */}
          <QuickThoughtManager />
        </div>
      </QuickThoughtProvider>
    </QueryProvider>
  );
}

