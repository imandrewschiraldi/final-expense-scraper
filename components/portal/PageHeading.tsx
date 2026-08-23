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
 * text — sized to read at the same letter-height the still-plain-text page
 * titles use, and centered so the shell's copper accent line runs through
 * the middle of it rather than sitting below it.
 */
export function PageHeading({ slug, alt }: { slug: PageHeadingSlug; alt: string }) {
  const { width, height } = HEADINGS[slug];
  return (
    <div className="mb-6 flex justify-center lg:mt-12">
      <Image src={`/headings/${slug}.png`} alt={alt} width={width} height={height} className="h-6 w-auto" priority />
    </div>
  );
}
