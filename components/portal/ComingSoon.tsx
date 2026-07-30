import { Card } from "@/components/ui/Card";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">{title}</h1>
      <Card>
        <p className="text-sm text-muted">{description}</p>
        <p className="mt-2 text-sm font-semibold text-copper">Coming soon.</p>
      </Card>
    </div>
  );
}
