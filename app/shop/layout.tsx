import type { Metadata } from "next";
import Link from "next/link";
import { getBuyer } from "@/lib/shop/session";
import { ShopLogoutButton } from "@/components/shop/ShopLogoutButton";

export const metadata: Metadata = {
  title: "Veteran Lead Shop",
  description: "Buy aged veteran final expense leads by state, delivered by email as a CSV.",
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const buyer = await getBuyer();
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-[linear-gradient(180deg,#121212,#070707)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/shop" className="font-condensed text-lg font-bold tracking-[0.08em] text-white uppercase">
            Tier 1 <span className="text-copper">Lead Shop</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop" className="text-foreground hover:text-white">
              Shop
            </Link>
            {buyer ? (
              <>
                <Link href="/shop/orders" className="text-foreground hover:text-white">
                  My orders
                </Link>
                <span className="hidden text-muted sm:inline">{buyer.email}</span>
                <ShopLogoutButton />
              </>
            ) : (
              <>
                <Link href="/shop/login" className="text-foreground hover:text-white">
                  Log in
                </Link>
                <Link href="/shop/signup" className="btn-metal-copper rounded-md px-3 py-1.5 font-semibold">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
