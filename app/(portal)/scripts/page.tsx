import { EmbeddedTool } from "@/components/portal/EmbeddedTool";

export default function ScriptsPage() {
  return (
    <EmbeddedTool
      title="Scripts"
      src="/tools/sales-script-dark.html"
      lightSrc="/tools/sales-script-light.html"
      greenSrc="/tools/sales-script-green.html"
    />
  );
}
