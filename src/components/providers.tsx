"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: any;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="desigator-theme">
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Prague">
        {children}
        <Toaster />
      </NextIntlClientProvider>
    </SessionProvider>
    </ThemeProvider>
  );
}
