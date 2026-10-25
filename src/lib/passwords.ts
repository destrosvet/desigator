import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/transactional-email";

export class PasswordError extends Error {
  constructor(public code: "invalidToken" | "wrongPassword" | "samePassword" | "unauthorized", public status: number) { super(code); }
}
export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(email: string, locale: "cs" | "en") {
  const account = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, isActive: true }, select: { id: true } });
  if (!account) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const recipient = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${account.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: account.id } });
    if (!current?.isActive) return null;
    await tx.passwordResetToken.deleteMany({ where: { userId: current.id } });
    await tx.passwordResetToken.create({ data: { tokenHash, userId: current.id, sessionVersion: current.sessionVersion, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    return current.email;
  });
  if (!recipient) return;
  try { await sendPasswordResetEmail(recipient, token, locale); }
  catch (error) {
    await db.passwordResetToken.deleteMany({ where: { tokenHash } });
    throw error;
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashResetToken(token);
  const candidate = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!candidate || candidate.expiresAt <= new Date()) throw new PasswordError("invalidToken", 400);
  const hashed = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${candidate.userId} FOR UPDATE`;
    const stored = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    const user = await tx.user.findUnique({ where: { id: candidate.userId } });
    if (!stored || stored.expiresAt <= new Date() || !user?.isActive || stored.sessionVersion !== user.sessionVersion) throw new PasswordError("invalidToken", 400);
    if (await bcrypt.compare(password, user.password)) throw new PasswordError("samePassword", 400);
    await tx.user.update({ where: { id: user.id }, data: { password: hashed, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
  });
}

export async function changePassword(userId: string, sessionVersion: number, currentPassword: string, password: string) {
  const hashed = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || user.sessionVersion !== sessionVersion) throw new PasswordError("unauthorized", 401);
    if (!(await bcrypt.compare(currentPassword, user.password))) throw new PasswordError("wrongPassword", 400);
    if (await bcrypt.compare(password, user.password)) throw new PasswordError("samePassword", 400);
    await tx.user.update({ where: { id: userId }, data: { password: hashed, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
  });
}
