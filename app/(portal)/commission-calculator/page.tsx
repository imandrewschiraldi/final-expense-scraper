import { EmbeddedTool } from "@/components/portal/EmbeddedTool";

export default function CommissionCalculatorPage() {
  return (
    <EmbeddedTool
      title="Commission Calculator"
      src="/tools/commission-calculator-dark.html"
      lightSrc="/tools/commission-calculator-light.html"
      greenSrc="/tools/commission-calculator-green.html"
    />
  );
}
