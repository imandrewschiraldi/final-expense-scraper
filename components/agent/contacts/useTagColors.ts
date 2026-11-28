"use client";

import { useEffect, useState } from "react";

const FALLBACK_COLOR = "#8a8a8a";

/** Shared tag-name -> color lookup (backed by the TagColor table) used by
 *  every place tag pills render on the Contacts page — the table, the
 *  Add/Edit Contact form, and the Contact Drawer. Fetches once per mount;
 *  `ensureColor` both updates local state immediately (so a just-created
 *  tag's pill is colored without waiting on a refetch) and upserts the
 *  color server-side so it's stable the next time anyone sees that tag. */
export function useTagColors() {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/agent/tag-colors")
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const c of data.colors ?? []) map[c.name] = c.color;
        setColors(map);
      })
      .catch(() => {});
  }, []);

  function colorFor(name: string): string {
    return colors[name] ?? FALLBACK_COLOR;
  }

  async function ensureColor(name: string) {
    if (colors[name]) return;
    const res = await fetch("/api/agent/tag-colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setColors((prev) => ({ ...prev, [data.color.name]: data.color.color }));
    }
  }

  return { colorFor, ensureColor };
}
