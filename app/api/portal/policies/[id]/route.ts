import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (guard.session.user.role !== "ADMIN" && existing.agentId !== guard.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clientName, clientPhone, state, carrier, product, annualPremium, status } = body as {
    clientName?: string;
    clientPhone?: string;
    state?: string;
    carrier?: string;
    product?: string;
    annualPremium?: number;
    status?: "SUBMITTED" | "ISSUED";
  };

  const policy = await db.policy.update({
    where: { id },
    data: {
      ...(clientName !== undefined ? { clientName: clientName.trim() } : {}),
      ...(clientPhone !== undefined ? { clientPhone: clientPhone.trim() || null } : {}),
      ...(state !== undefined ? { state: state.trim().toUpperCase() || null } : {}),
      ...(carrier !== undefined ? { carrier: carrier.trim() } : {}),
      ...(product !== undefined ? { product: product.trim() || null } : {}),
      ...(annualPremium !== undefined ? { annualPremium } : {}),
      ...(status !== undefined
        ? {
            status,
            issuedAt: status === "ISSUED" ? (existing.issuedAt ?? new Date()) : null,
          }
        : {}),
    },
  });

  return NextResponse.json({ policy });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (guard.session.user.role !== "ADMIN" && existing.agentId !== guard.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.policy.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
