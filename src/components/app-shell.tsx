"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  Menu,
  Radar,
  ShieldQuestion,
  Trophy,
  Users,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: Gauge },
  { href: "/data", label: "Data Hub", icon: Database },
  { href: "/stats", label: "Stats Engine", icon: BarChart3 },
  { href: "/ml-lab", label: "ML Lab", icon: BrainCircuit },
  { href: "/players", label: "Players", icon: Users },
  { href: "/opponents", label: "Opponents", icon: Radar },
  { href: "/games", label: "Games", icon: Trophy },
  { href: "/strategy", label: "Strategy", icon: Workflow },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/methodology", label: "Methodology", icon: ShieldQuestion },
];

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
}: {
  href: string;
  label: string;
  icon: typeof Gauge;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const content = (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground ring-1 ring-border",
        compact && "w-9 justify-center px-0"
      )}
    >
      <Icon className="size-4" />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!compact) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={cn("grid gap-1", mobile ? "mt-4" : "mt-6")}>
      {navItems.map((item) => (
        <NavLink key={item.href} {...item} compact={!mobile} />
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 border-r bg-card/70 px-3 py-4 backdrop-blur lg:block">
        <Link
          href="/dashboard"
          className="flex size-10 items-center justify-center rounded-md border bg-background font-mono text-sm font-semibold"
        >
          MO
        </Link>
        <Navigation />
      </aside>

      <header className="sticky top-0 z-20 border-b bg-background/92 backdrop-blur lg:pl-16">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="lg:hidden" variant="outline" size="icon-sm" aria-label="Open Navigation">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Mount Olive SPANAL</SheetTitle>
                </SheetHeader>
                <Navigation mobile />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-normal">Mount Olive SPANAL</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                Football Analytics Command Center / Demo Data
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ClipboardList className="size-4" />
            <span className="font-mono">2026 demo season</span>
          </div>
        </div>
      </header>

      <main className="lg:pl-16">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
