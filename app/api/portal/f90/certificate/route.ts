import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { generateF90Certificate } from "@/lib/certificate";
import { f90IsEligibleForCertificate, F90_GRADUATION_AP } from "@/lib/f90Content";
import { getAgencySettings } from "@/lib/agencySettings";

// Re-checks eligibility itself rather than trusting the client's own
// computed state — the download link is just a plain GET, so anyone
// signed in could otherwise hit this directly before actually qualifying.
// ?inline=1 is for displaying the certificate directly on the graduated
// F90 page itself (an <iframe> or <embed>) — the plain attachment
// disposition below is still what the panel's own blob-download button
// uses, unaffected either way since that flow fetches and saves manually.
export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const [user, issuedPolicies, settings] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, f90EnrolledAt: true, f90CompletedSteps: true },
    }),
    db.policy.findMany({
      where: { agentId: userId, status: "ISSUED" },
      select: { annualPremium: true },
    }),
    getAgencySettings(),
  ]);

  if (!user?.f90EnrolledAt) {
    return NextResponse.json({ error: "Not enrolled in F90" }, { status: 403 });
  }

  const issuedAP = issuedPolicies.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );

  if (!f90IsEligibleForCertificate(user.f90CompletedSteps, issuedAP)) {
    return NextResponse.json(
      {
        error: `Not yet eligible — requires $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium and every Phase 1-4 step checked off.`,
      },
      { status: 403 },
    );
  }

  const pdfBytes = await generateF90Certificate({
    agentName: user.name,
    completionDate: new Date(),
    issuedAP,
    signatureName: settings.f90SignatureName,
  });

  const safeName = user.name.replace(/[^a-zA-Z0-9]+/g, "-");
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="F90-Certificate-${safeName}.pdf"`,
    },
  });
}
