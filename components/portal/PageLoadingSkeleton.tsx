import { PageHeading, PageHeadingSlug } from "@/components/portal/PageHeading";

/**
 * Generic `loading.tsx` content for pages whose server component awaits a
 * DB query before it can render anything — without this, Next.js just
 * freezes the previous page in place for however long that query takes,
 * then snaps to the new one all at once. Next to pages that render
 * instantly (no data to await), that uneven pause-then-snap is what reads
 * as sidebar navigation being "glitchy"/inconsistent rather than smooth.
 *
 * Renders the real PageHeading image (a synchronous, already-cached asset)
 * immediately so the heading itself doesn't pop in late once the real page
 * replaces this — only the rows below it are the placeholder.
 */
export function PageLoadingSkeleton({
  slug,
  alt,
  rows = 4,
}: {
  slug?: PageHeadingSlug;
  alt?: string;
  rows?: number;
}) {
  return (
    <div>
      {slug && alt && <PageHeading slug={slug} alt={alt} />}
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-surface2"
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
