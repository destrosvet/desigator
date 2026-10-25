"use client";

import { useSession, signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ChevronDown, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { Link } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const t = useTranslations("userMenu");
  const roles = useTranslations("roles");
  const locale = useLocale();
  const user = session?.user;
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase(locale) || "?";
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-11 max-w-[min(65vw,18rem)] gap-2 rounded-xl px-2" aria-label={t("open")}>
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{initials}</span>
      <span className="hidden min-w-0 text-left sm:block"><span className="block truncate text-sm font-medium">{user?.name || t("account")}</span>{user?.role ? <span className="block text-xs text-muted-foreground">{roles(user.role)}</span> : null}</span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] rounded-xl p-2">
      <DropdownMenuLabel className="min-w-0"><p className="truncate font-semibold">{user?.name || t("account")}</p><p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="min-h-10 rounded-lg"><Link href="/settings?section=profile"><UserRound />{t("profile")}</Link></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("appearance")}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme || "system"} onValueChange={setTheme} aria-label={t("appearance")}>
        <DropdownMenuRadioItem value="light" className="min-h-9 rounded-lg"><Sun />{t("light")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark" className="min-h-9 rounded-lg"><Moon />{t("dark")}</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system" className="min-h-9 rounded-lg"><Monitor />{t("system")}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" className="min-h-10 rounded-lg" onSelect={() => { void signOut({ callbackUrl: "/" + locale + "/auth/login" }); }}><LogOut />{t("logout")}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
