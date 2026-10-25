import { pathToFileURL } from "node:url";

export function checkDeployment(env) {
  const errors = []; const warnings = [];
  const readUrl = (name, value, protocols) => {
    try { const url = new URL(value || ""); if (!protocols.includes(url.protocol) || !url.hostname) throw new Error(); return url; }
    catch { errors.push(name + ": invalid or missing URL"); return null; }
  };
  const app = readUrl("APP_URL", env.APP_URL, ["http:", "https:"]);
  const local = app && ["localhost", "127.0.0.1", "[::1]"].includes(app.hostname);
  if (app && (app.username || app.password || app.pathname !== "/" || app.search || app.hash)) errors.push("APP_URL must be a public origin without path or credentials");
  if (app && !local && app.protocol !== "https:") errors.push("APP_URL must use HTTPS outside localhost");
  const auth = readUrl("NEXTAUTH_URL / AUTH_URL", env.NEXTAUTH_URL || env.AUTH_URL, ["http:", "https:"]);
  if (app && auth && app.origin !== auth.origin) errors.push("APP_URL and authentication URL must have the same origin");
  for (const name of ["AUTH_URL", "NEXTAUTH_URL"]) if (env[name] && app) { try { if (new URL(env[name]).origin !== app.origin) errors.push(name + " must match APP_URL"); } catch { errors.push(name + ": invalid URL"); } }
  const secret = env.NEXTAUTH_SECRET || env.AUTH_SECRET || "";
  if (secret.length < 32 || /replace|example|changeme/i.test(secret)) errors.push("AUTH_SECRET / NEXTAUTH_SECRET must be a random secret of at least 32 characters");
  if (env.AUTH_SECRET && env.NEXTAUTH_SECRET && env.AUTH_SECRET !== env.NEXTAUTH_SECRET) errors.push("AUTH_SECRET and NEXTAUTH_SECRET must match when both are set");
  const database = readUrl("DATABASE_URL", env.DATABASE_URL, ["postgres:", "postgresql:"]);
  if (database && !local && (!database.password || database.password === "desigator_password")) errors.push("DATABASE_URL must use a dedicated production password");
  readUrl("S3_ENDPOINT", env.S3_ENDPOINT, ["http:", "https:"]);
  for (const name of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) if (!env[name]?.trim()) errors.push(name + " is required");
  if (!local && env.S3_SECRET_ACCESS_KEY === "minioadmin") errors.push("Replace the default S3 credentials before deployment");
  if (env.S3_FORCE_PATH_STYLE && !["true", "false"].includes(env.S3_FORCE_PATH_STYLE)) errors.push("S3_FORCE_PATH_STYLE must be true or false");
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) { if (local) warnings.push("Password recovery email is not configured (returns 503)"); else errors.push("RESEND_API_KEY and RESEND_FROM are required for production password recovery"); }
  return { errors, warnings };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkDeployment(process.env);
  for (const warning of result.warnings) console.warn("WARNING: " + warning);
  for (const error of result.errors) console.error("ERROR: " + error);
  if (result.errors.length) process.exitCode = 1; else console.log("Deployment configuration OK (secret values are never printed)");
}
