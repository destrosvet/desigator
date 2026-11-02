import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/transactional-email";
export const verificationHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function requestEmailVerification(email: string, locale: "cs" | "en") {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = verificationHash(token);
  const recipient = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.isActive || current.emailVerifiedAt) return null;
    await tx.emailVerificationToken.upsert({ where: { userId: user.id }, create: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86400000) }, update: { tokenHash, expiresAt: new Date(Date.now() + 86400000) } });
    return current.email;
  });
  if (!recipient) return;
  try { await sendVerificationEmail(recipient, token, locale); }
  catch (error) { await db.emailVerificationToken.deleteMany({ where: { tokenHash } }); throw error; }
}
export async function verifyEmail(token: string) {
  const tokenHash = verificationHash(token);
  const candidate = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!candidate) return false;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`;
    const stored = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
    const user = await tx.user.findUnique({ where: { id: candidate.userId } });
    if (!stored || stored.expiresAt <= new Date() || !user?.isActive || user.emailVerifiedAt) return false;
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    return true;
  });
}
