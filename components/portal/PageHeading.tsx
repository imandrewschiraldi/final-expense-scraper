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
  "team-chat": { width: 413, height: 45 },
} as const;

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
 * band gets an even 20px margin-top and 20px gap before the line.
 */
export function PageHeading({ slug, alt }: { slug: PageHeadingSlug; alt: string }) {
  const { width, height } = HEADINGS[slug];
  return (
    <div className="mb-6 mt-3 flex justify-center lg:mt-[20px]">
      <Image
        src={`/headings/${slug}.png`}
        alt={alt}
        width={width}
        height={height}
        className="h-[17px] w-auto lg:h-[26px]"
        priority
      />
    </div>
  );
}
