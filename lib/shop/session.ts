import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Shop buyers get their own signed cookie instead of a NextAuth session, so a
 * self-registered buyer can never pick up a portal login or role. The cookie
 * is `<buyerId>.<expiresAtSeconds>.<hmac>`, signed with AUTH_SECRET.
 */
const COOKIE = "shop_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET must be set to sign shop sessions");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`shop:${payload}`).digest("base64url");
}

export async function setBuyerSession(buyerId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${buyerId}.${exp}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearBuyerSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getBuyerId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return id;
}

export async function getBuyer() {
  const id = await getBuyerId();
  if (!id) return null;
  return db.shopBuyer.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
}
