import Image from "next/image";

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
  "submit-policy": { width: 1055, height: 88 },
  "book-of-business": { width: 1302, height: 88 },
  "agency-dashboard": { width: 1472, height: 88 },
  leaderboard: { width: 1060, height: 88 },
  dashboard: { width: 879, height: 88 },
} as const;

export type PageHeadingSlug = keyof typeof HEADINGS;

/**
 * A page's title, rendered as its graphic copper wordmark instead of plain
 * text — centered so the shell's copper accent line runs through the middle
 * of it rather than sitting below it.
 *
 * Sized as large as the longest current title ("Agency Dashboard") can go
 * without exceeding the content column's width (max-w-6xl, 1152px) — 56px
 * tall renders it at ~937px. Matching the much larger scale the external
 * Scripts/Commission Calculator tools use for their own single-word-ish
 * titles isn't possible here across the board: at that size "Agency
 * Dashboard" and "Book of Business" would render wider than the page.
 */
export function PageHeading({ slug, alt }: { slug: PageHeadingSlug; alt: string }) {
  const { width, height } = HEADINGS[slug];
  return (
    <div className="mb-6 flex justify-center lg:mt-10">
      <Image src={`/headings/${slug}.png`} alt={alt} width={width} height={height} className="h-14 w-auto" priority />
    </div>
  );
}
