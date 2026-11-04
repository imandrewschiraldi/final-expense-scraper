import { Suspense } from "react";
import { BuyerAuthForm } from "@/components/shop/BuyerAuthForm";

export default function ShopLoginPage() {
  return (
    <div className="py-6">
      <Suspense fallback={null}>
        <BuyerAuthForm mode="login" />
      </Suspense>
    </div>
  );
}
