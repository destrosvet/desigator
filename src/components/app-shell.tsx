"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  GraduationCap,
  LogOut,
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
      <div className="flex items-center gap-2 px-4 py-6">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">Desigator</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {t(item.label)}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {session?.user?.name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/login` })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t("navigation.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        {navContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {navContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={cn("border-b items-center px-4 lg:px-8", compact ? "hidden" : "h-14 flex")}>
          <div className="lg:hidden w-8" /> {/* spacer for mobile menu button */}
        </header>
        <div className={cn("flex-1 overflow-auto", compact ? "p-3 lg:p-4" : "p-4 lg:p-8")}>{children}</div>
      </main>
    </div>
  );
}
