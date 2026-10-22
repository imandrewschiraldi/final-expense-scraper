"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTour } from "@/components/tour/TourProvider";

/** Only ever rendered for Manager/Agent — ProfilePanel gates this on role so
 *  useTour() is never called without a TourProvider ancestor (Admin has
 *  neither). */
export function ProfileTourButton() {
  const { start } = useTour();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Tour</CardTitle>
      </CardHeader>
      <div className="flex items-center justify-between gap-4">
        <p className="max-w-md text-sm text-muted">
          A guided walkthrough of every section of the platform — pick it back up any time.
        </p>
        <Button onClick={start}>Take the Platform Tour</Button>
      </div>
    </Card>
  );
}
