import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { QuickThoughtProvider } from "@/components/nabu/quick-thought-context";
import { QuickThoughtManager } from "@/components/nabu/quick-thought-manager";

interface NabuLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for the Nabu application section
 * Minimalist layout with integrated sidebar navigation
 */
export default async function NabuLayout({ children }: NabuLayoutProps) {
  const user = await getCurrentUser();

  // Redirect to login if user is not authenticated
  if (!user) redirect("/login");

  return (
    <QuickThoughtProvider>
      {/* Multi-layer gradient background for premium feel */}
      <div className="relative flex min-h-screen w-full bg-background">
        {/* Radial gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-secondary/8 via-transparent to-transparent pointer-events-none" />
        
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
        
        {/* Main content - full width, children handle their own layout */}
        <main className="relative flex-1 w-full">
          {children}
        </main>

        {/* Quick Thought Manager - handles all modals and minimized thoughts */}
        <QuickThoughtManager />
      </div>
    </QuickThoughtProvider>
  );
}

