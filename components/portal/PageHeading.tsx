"use client";

import Image from "next/image";
import { useTheme } from "@/lib/useTheme";

// Intrinsic pixel size of each cropped wordmark in public/headings/ — needed
// by next/image to reserve layout space before the file loads. Add an entry
// here (and drop the matching PNG in public/headings/) as more of these
// graphic titles replace a page's plain-text heading.
const HEADINGS = {
  reports: { width: 645, height: 88 },
  hierarchy: { width: 827, height: 88 },
  training: { width: 687, height: 88 },
  "lead-vault": { width: 820, height: 87 },
  "my-leads": { width: 721, height: 88 },
  "trusted-lead-vendors": { width: 1695, height: 88 },
  "submit-policy": { width: 1055, height: 88 },
  "book-of-business": { width: 1302, height: 88 },
  "agency-dashboard": { width: 1472, height: 88 },
  leaderboard: { width: 1060, height: 88 },
  dashboard: { width: 879, height: 88 },
  "team-chat": { width: 413, height: 45 },
  leads: { width: 470, height: 88 },
  "import-leads": { width: 526, height: 45 },
  "all-leads": { width: 391, height: 45 },
  "assign-leads": { width: 511, height: 45 },
  "quote-tool": { width: 430, height: 48 },
  "carrier-resources": { width: 746, height: 43 },
  "recruiting-radar": { width: 695, height: 43 },
  "job-applications": { width: 528, height: 43 },
  "underwriting-genie": { width: 776, height: 47 },
  notifications: { width: 553, height: 45 },
} as const;

// Light-mode counterparts, cropped to the same glyph-to-image-height ratio
// as their dark original (see HEADINGS above) so the lettering reads the
// same size when the theme swaps — only cover the slugs a light wordmark
// actually exists for; everything else keeps using the dark PNG in both
// themes (it already reads fine on a light background).
const HEADINGS_LIGHT = {
  "book-of-business": { width: 662, height: 43 },
  leaderboard: { width: 538, height: 43 },
  "team-chat": { width: 410, height: 43 },
  "agency-dashboard": { width: 748, height: 43 },
  dashboard: { width: 444, height: 42 },
  reports: { width: 326, height: 43 },
  hierarchy: { width: 421, height: 45 },
  training: { width: 348, height: 42 },
  "lead-vault": { width: 416, height: 42 },
  "trusted-lead-vendors": { width: 861, height: 45 },
  "submit-policy": { width: 534, height: 43 },
  leads: { width: 237, height: 43 },
  "import-leads": { width: 523, height: 43 },
  "all-leads": { width: 389, height: 43 },
  "assign-leads": { width: 510, height: 42 },
  "quote-tool": { width: 428, height: 46 },
  "carrier-resources": { width: 739, height: 41 },
  "recruiting-radar": { width: 690, height: 39 },
  "job-applications": { width: 527, height: 41 },
  "underwriting-genie": { width: 768, height: 43 },
  notifications: { width: 548, height: 38 },
} satisfies Partial<Record<keyof typeof HEADINGS, { width: number; height: number }>>;

export type PageHeadingSlug = keyof typeof HEADINGS;

/**
 * A page's title, rendered as its graphic copper wordmark instead of plain
 * text — sitting cleanly above the shell's copper accent line (never
 * straddling it) with even breathing room on both sides.
 *
 * The Scripts/Commission Calculator tools render their own titles at a
 * measured ~20px actual letter height on desktop (~13px below `lg`),
 * regardless of each logo's own image padding. Every wordmark here is
 * cropped to the same glyph-to-image ratio (a 68px-tall glyph inside an
 * 88px-tall crop, ~77%), so one display height reproduces that same
 * lettered height for all of them: 26px tall -> ~20px letters,
 * 17px tall -> ~13px letters.
 *
 * Desktop vertical centering: content starts 8px below main's top (its
 * `pt-2`) and the accent line sits at HEADER_HEIGHT (74px, see Sidebar.tsx),
 * leaving a 66px band above the line. A 26px-tall image centered in that
 * band gets an even 20px margin-top and 20px gap before the line. The
 * wrapper's own `mb-8` below that is clearance AFTER the line — the page's
 * real content (whatever follows PageHeading) starts there, not at the
 * image's own bottom edge, so it needs enough room that it visibly starts
 * below the line instead of butting up against it.
 */
export function PageHeading({
  slug,
  alt,
  wrapperClassName,
}: {
  slug: PageHeadingSlug;
  alt: string;
  // Lets one page sit closer to (or further from) the line than the shared
  // default, without changing every other page's heading.
  wrapperClassName?: string;
}) {
  const [theme] = useTheme();
  const lightSize = (HEADINGS_LIGHT as Partial<Record<PageHeadingSlug, { width: number; height: number }>>)[slug];
  const useLight = theme === "light" && !!lightSize;
  const { width, height } = useLight ? lightSize! : HEADINGS[slug];
  return (
    <div className={wrapperClassName ?? "mb-8 mt-3 flex justify-center lg:mt-[20px]"}>
      <Image
        src={`/headings/${slug}${useLight ? "-light" : ""}.png`}
        alt={alt}
        width={width}
        height={height}
        className="h-[17px] w-auto lg:h-[26px]"
        priority
      />
    </div>
  );
}
