"use client";

import { motion } from "motion/react";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { TopProducer } from "@/lib/agencyDashboardShared";

function Avatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-copper-dim object-cover" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-copper-dim bg-surface2 text-sm font-bold text-muted">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function TopProducers({ producers }: { producers: TopProducer[] }) {
  return (
    <PremiumPanel className="p-5">
      <h3 className="font-condensed mb-3 text-base font-extrabold tracking-wide text-white uppercase">Top Producers</h3>
      {producers.length === 0 ? (
        <p className="text-sm text-muted">No issued business yet in this timeframe.</p>
      ) : (
        <div className="space-y-1">
          {producers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/[0.03]"
            >
              <span className="w-5 shrink-0 text-center font-bold text-copper">{i + 1}</span>
              <Avatar url={p.profileImageUrl} name={p.name} />
              <span className="min-w-0 flex-1 truncate text-white">{p.name}</span>
              <span className="shrink-0 font-semibold text-copper">
                {p.issuedAP.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </PremiumPanel>
  );
}
