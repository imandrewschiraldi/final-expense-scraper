import Image from "next/image";
import { AskIntegrityTool } from "@/components/portal/AskIntegrityTool";

export default function AskIntegrityPage() {
  return (
    <div>
      <div className="mt-4 mb-10 flex justify-center">
        <Image
          src="/ask-integrity-logo.png"
          alt="Ask Integrity"
          width={1000}
          height={251}
          className="h-11 w-auto"
          priority
        />
      </div>
      <AskIntegrityTool />
    </div>
  );
}
