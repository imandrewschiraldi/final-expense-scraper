import Papa from "papaparse";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { HOLD_DAYS, formatCents, tierInfo } from "@/lib/shop/config";

function formatDob(d: Date | null) {
  if (!d) return "";
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export async function buildOrderCsv(orderId: string) {
  const rows = await db.shopOrderLead.findMany({
    where: { orderId },
    select: { lead: true },
    orderBy: [{ lead: { state: "asc" } }, { lead: { lastName: "asc" } }],
  });
  return Papa.unparse(
    rows.map(({ lead }) => ({
      "First Name": lead.firstName,
      "Last Name": lead.lastName,
      Phone: lead.phone,
      State: lead.state,
      "Date of Birth": formatDob(lead.dateOfBirth),
      Email: lead.email ?? "",
      Address: lead.address ?? "",
      Zip: lead.zip ?? "",
      County: lead.county ?? "",
      Gender: lead.gender ?? "",
      "Military Branch": lead.militaryBranch ?? "",
    })),
  );
}

/**
 * Emails the order's CSV to the buyer and marks the order FULFILLED. On a
 * send failure the order stays PAID so the buyer (or the next webhook retry)
 * can try again — the leads themselves are already on hold either way.
 */
export async function deliverOrder(orderId: string) {
  const order = await db.shopOrder.findUnique({ where: { id: orderId }, include: { buyer: true } });
  if (!order || (order.status !== "PAID" && order.status !== "FULFILLED")) {
    throw new Error("Order is not paid");
  }
  const csv = await buildOrderCsv(orderId);
  const tier = tierInfo(order.tier);
  const shortId = order.id.slice(-8).toUpperCase();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SHOP_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "Lead Shop <onboarding@resend.dev>",
    to: order.deliverToEmail,
    subject: `Your ${order.leadCount.toLocaleString("en-US")} veteran final expense leads (order ${shortId})`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #222;">
        <h1 style="color: #c87941; font-size: 22px;">Your leads are attached</h1>
        <p>Hi ${escapeHtml(order.buyer.name)}, thanks for your order. Your CSV file is attached to this email.</p>
        <table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Order</td><td>${shortId}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Lead age</td><td>${tier.label}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Leads</td><td>${order.leadCount.toLocaleString("en-US")}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0; color: #666;">Total paid</td><td>${formatCents(order.totalCents)}</td></tr>
        </table>
        <p style="color: #666; font-size: 13px;">These leads are held for you for ${HOLD_DAYS} days. No other buyer can purchase them during that time.</p>
      </div>`,
    attachments: [{ filename: `veteran-leads-${shortId}.csv`, content: Buffer.from(csv, "utf8") }],
  });
  if (error) throw new Error(`Resend failed to send lead CSV: ${error.message}`);

  await db.shopOrder.update({ where: { id: orderId }, data: { status: "FULFILLED", deliveredAt: new Date() } });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
