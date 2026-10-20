"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Vendor = { id: string; name: string; description: string | null; url: string };

export function BuyLeadsGrid() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/lead-vendors")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load lead vendors");
        return res.json();
      })
      .then((data) => setVendors(data.vendors ?? []))
      .catch(() => setError("Failed to load lead vendors."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;
  if (error) return <p className="text-sm text-red-light">{error}</p>;
  if (vendors.length === 0) {
    return <p className="text-sm text-muted">No lead vendors have been added yet.</p>;
  }

  // Same lone-leftover handling as Carrier Resources — an odd count's last
  // card spans both columns instead of sitting stuck on the left.
  const isTrailingOdd = (i: number) => vendors.length % 2 === 1 && i === vendors.length - 1;

  return (
    <div className="grid grid-cols-1 justify-center gap-x-14 gap-y-8 lg:grid-cols-[repeat(2,24rem)]">
      {vendors.map((vendor, i) => (
        <div key={vendor.id} className={cn("mx-auto w-full max-w-sm", isTrailingOdd(i) && "lg:col-span-2")}>
          <h2 className="font-montserrat mb-3 text-center text-2xl font-black tracking-wide text-white uppercase">
            {vendor.name}
          </h2>

          <div className="metal-copper-card rounded-lg p-5">
            {vendor.description && (
              <p className="mb-4 text-center text-sm text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]">
                {vendor.description}
              </p>
            )}

            <a
              href={vendor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-condensed metal-copper-surface block rounded-md px-4 py-3 text-center text-sm font-bold tracking-[0.05em] text-white uppercase transition-all hover:brightness-110 active:translate-y-px"
            >
              Visit Site
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
