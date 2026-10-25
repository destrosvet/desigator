import type { Metadata } from "next";
import { PasswordForm } from "@/components/password-form";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function PasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted p-4"><PasswordForm mode="forgot" /></main>;
}
