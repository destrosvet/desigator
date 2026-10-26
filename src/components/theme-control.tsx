"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
const subscribe = () => () => {};
export function ThemeControl({ expanded = false }: { expanded?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme(); const locale = useLocale();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? theme || "system" : "system";
  const english = locale === "en";
  const options = [{ value: "light", label: english ? "Light" : "Světlý", icon: Sun }, { value: "dark", label: english ? "Dark" : "Tmavý", icon: Moon }, { value: "system", label: english ? "System" : "Podle systému", icon: Monitor }];
  const label = english ? "Appearance" : "Vzhled";
  if (expanded) return <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label={label}>{options.map(({ value, label, icon: Icon }) => <Button key={value} variant="outline" aria-pressed={current === value} className={"h-auto justify-start gap-3 rounded-xl p-4 " + (current === value ? "border-primary bg-accent text-accent-foreground ring-1 ring-primary/20" : "")} onClick={() => setTheme(value)}><Icon className="size-5" /><span>{label}</span>{current === value && <Check className="ml-auto size-4" />}</Button>)}</div>;
  const dark = mounted && resolvedTheme === "dark";
  const toggleLabel = english ? dark ? "Switch to light mode" : "Switch to dark mode" : dark ? "Zapnout světlý režim" : "Zapnout tmavý režim";
  return <Button variant="ghost" size="icon" aria-label={toggleLabel} title={toggleLabel} onClick={() => setTheme(dark ? "light" : "dark")}><Sun className="hidden size-4 dark:block" /><Moon className="size-4 dark:hidden" /></Button>;
}
