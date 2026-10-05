import webpush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type PushPayload = { title: string; body: string; url: string };

const SEND_TIMEOUT_MS = 8000;

/** Races a push send against a hard timeout — a stalled connection to a
 *  dead endpoint must never hang the request (lead assignment, goal
 *  awarding, chat message) that triggered it. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("push send timed out")), ms)),
  ]);
}

/**
 * Sends a real OS-level push to every device a user has subscribed on
 * (phone + laptop both get it independently). Best-effort: a subscription
 * the push service reports as gone (404/410 — the agent uninstalled the
 * app, cleared data, etc.) is deleted so it stops erroring on every future
 * send; any other failure (including a timeout) is logged and otherwise
 * ignored, since a push failing should never break the request that
 * triggered it.
 *
 * No-ops quietly if VAPID keys aren't configured (e.g. local dev without
 * them set), or if the push_subscriptions table doesn't exist yet on this
 * database (the migration hasn't been applied there yet) — either way, a
 * push failing to go out must never break the request that triggered it
 * (lead assignment, goal awarding, a chat message send).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return;

  let subs: { id: string; endpoint: string; p256dh: string; auth: string }[];
  try {
    subs = await db.pushSubscription.findMany({ where: { userId } });
  } catch (err) {
    console.error("push subscription lookup failed", err);
    return;
  }
  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await withTimeout(
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          ),
          SEND_TIMEOUT_MS,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("push send failed", sub.id, err);
        }
      }
    }),
  );
}
