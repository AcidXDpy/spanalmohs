"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  Clapperboard,
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
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/data", label: "Data", icon: Database },
  { href: "/film", label: "Film Review", icon: Clapperboard },
  { href: "/stats", label: "Team Performance", icon: BarChart3 },
  { href: "/ml-lab", label: "Model Evaluation", icon: BrainCircuit },
  { href: "/players", label: "Player Performance", icon: Users },
  { href: "/opponents", label: "Opponent Analysis", icon: Radar },
  { href: "/games", label: "Game Analysis", icon: Trophy },
  { href: "/strategy", label: "Decision Analysis", icon: Workflow },
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
  const router = useRouter();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    router.push(href);
  };

  const content = (
    <Link
      href={href}
      aria-label={compact ? label : undefined}
      onClick={navigate}
      onFocus={() => router.prefetch(href)}
      onMouseEnter={() => router.prefetch(href)}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground ring-1 ring-border",
        compact && "w-9 justify-center px-0"
      )}
    >
      <Icon className="pointer-events-none size-4" />
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
  const pathname = usePathname();
  const editorial = ["/dashboard", "/stats", "/players", "/opponents"].includes(pathname);
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
                Football Analytics / Demo Data
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
        <div className={cn("mx-auto w-full px-4 py-5 sm:px-6 lg:px-8", !editorial && "max-w-[1600px]")}>{children}</div>
      </main>
    </div>
  );
}
