import { Suspense } from "react";
import { BuyerAuthForm } from "@/components/shop/BuyerAuthForm";

export default function ShopSignupPage() {
  return (
    <div className="py-6">
      <Suspense fallback={null}>
        <BuyerAuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
