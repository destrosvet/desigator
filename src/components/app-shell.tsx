"use client";

import { UserMenu } from "@/components/user-menu";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  GraduationCap,
  ChartColumn,
  Menu,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "navigation.dashboard", roles: ["ADMIN", "TEACHER", "EVALUATOR", "STUDENT"] },
  { href: "/classes", icon: BookOpen, label: "navigation.classes", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { href: "/subjects", icon: BookOpen, label: "navigation.subjects", roles: ["ADMIN", "TEACHER", "EVALUATOR", "STUDENT"] },
  { href: "/tasks", icon: ClipboardList, label: "navigation.tasks", roles: ["ADMIN", "TEACHER", "EVALUATOR", "STUDENT"] },
  { href: "/students", icon: Users, label: "navigation.students", roles: ["ADMIN", "TEACHER"] },
  { href: "/evaluations", icon: GraduationCap, label: "navigation.evaluations", roles: ["ADMIN", "TEACHER", "EVALUATOR"] },
  { href: "/statistics", icon: ChartColumn, label: "navigation.statistics", roles: ["ADMIN", "TEACHER"] },
  { href: "/settings", icon: Settings, label: "navigation.settings", roles: ["ADMIN", "TEACHER", "EVALUATOR", "STUDENT"] },
];

export function AppShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.role as string;

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 pb-8 pt-7">
        <div className="brand-mark size-10 bg-primary rounded-2xl shadow-sm flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div><span className="font-bold text-xl tracking-tight">Desigator<span className="text-primary">.</span></span><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{locale === "en" ? "Creative classroom" : "Prostor pro tvorbu"}</p></div>
      </div>

      <nav aria-label={locale === "en" ? "Main navigation" : "Hlavní navigace"} className="flex-1 space-y-1.5 px-4">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === "/" + locale + item.href || pathname?.startsWith("/" + locale + item.href + "/");
          return (
            <Link
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "nav-active bg-sidebar-accent text-sidebar-accent-foreground shadow-xs ring-1 ring-primary/10"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {t(item.label)}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>


    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        {navContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="absolute top-3 left-4 z-50" aria-label={locale === "en" ? "Open navigation" : "Otevřít navigaci"}>
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="app-sidebar w-64 bg-sidebar p-0">
          {navContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("border-b items-center px-4 lg:px-8", compact ? "hidden" : "h-16 flex justify-between bg-card/70 backdrop-blur-md")}>
          <div className="flex items-center gap-3"><div className="w-8 lg:hidden" /><span className="text-sm font-semibold">{t(filteredNav.find((item) => pathname === "/" + locale + item.href || pathname?.startsWith("/" + locale + item.href + "/"))?.label || "navigation.dashboard")}</span></div><UserMenu />
        </header>
        <div className={cn("app-content flex-1 overflow-auto", compact ? "p-3 lg:p-4" : "p-4 lg:p-8")}>{children}</div>
      </main>
    </div>
  );
}
