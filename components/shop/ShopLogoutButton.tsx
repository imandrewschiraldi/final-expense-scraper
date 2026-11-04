"use client";

import { useRouter } from "next/navigation";

export function ShopLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-muted hover:text-white"
      onClick={async () => {
        await fetch("/api/shop/auth/logout", { method: "POST" });
        router.push("/shop");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
