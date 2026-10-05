"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PolicySubmitForm, type SubmittedPolicy } from "@/components/portal/PolicySubmitForm";
import { WinCard } from "@/components/portal/WinCard";

export function SubmitPolicyPanel({ isAgent, agentName }: { isAgent: boolean; agentName: string | null | undefined }) {
  const [lastSubmitted, setLastSubmitted] = useState<SubmittedPolicy | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Policy</CardTitle>
        </CardHeader>
        {lastSubmitted && (
          <p className="mb-4 text-sm text-teal-light">
            Submitted {lastSubmitted.clientName} with {lastSubmitted.carrier}. View it on{" "}
            <Link href="/portal/book-of-business" className="underline">
              Book of Business
            </Link>
            .
          </p>
        )}
        <PolicySubmitForm isAgent={isAgent} onSubmitted={setLastSubmitted} />
      </Card>
      {lastSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Win Card</CardTitle>
          </CardHeader>
          <WinCard key={lastSubmitted.id} policy={lastSubmitted} agentName={agentName} />
        </Card>
      )}
    </div>
  );
}
