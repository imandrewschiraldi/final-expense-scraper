"use client";

import { WinCardImage } from "@/components/portal/WinCardImage";
import { winCardDataFromPolicy } from "@/lib/winCard";
import type { SubmittedPolicy } from "@/components/portal/PolicySubmitForm";

export function WinCard({ policy, agentName }: { policy: SubmittedPolicy; agentName: string | null | undefined }) {
  return (
    <WinCardImage
      data={winCardDataFromPolicy(agentName, policy)}
      downloadName={`tier1-win-${policy.clientName.replace(/\s+/g, "-").toLowerCase()}.png`}
    />
  );
}
