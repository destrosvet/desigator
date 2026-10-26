import { createHash } from "crypto";
type MailLocale = "cs" | "en";
export function mailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const configuredUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!apiKey || !from || !configuredUrl) throw new Error("Email is not configured");
  const url = new URL(configuredUrl);
  if (!(["http:", "https:"].includes(url.protocol)) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid APP_URL");
  return { apiKey, from, origin: url.origin };
}
export async function sendPasswordResetEmail(email: string, token: string, locale: MailLocale) {
  const { apiKey, from, origin } = mailConfiguration();
  // The fragment keeps the secret out of server access logs and Referer headers.
  const link = origin + "/" + locale + "/auth/reset-password#token=" + token;
  const en = locale === "en";
  const text = en
    ? "A password reset was requested for your Desigator account. Set a new password within 30 minutes:\n\n" + link + "\n\nIf you did not request this, ignore this email."
    : "Obdrželi jsme žádost o obnovu hesla k vašemu účtu Desigator. Nové heslo nastavte do 30 minut:\n\n" + link + "\n\nPokud jste o obnovu nežádali, e-mail ignorujte.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json", "Idempotency-Key": "password-reset/" + createHash("sha256").update(token).digest("hex") },
    body: JSON.stringify({ from, to: [email], subject: en ? "Desigator: reset your password" : "Desigator: obnova hesla", text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Email delivery failed");
  const result = await response.json();
  if (typeof result.id !== "string") throw new Error("Email delivery failed");
}
