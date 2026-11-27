import { PipelineStagesPanel } from "@/components/admin/PipelineStagesPanel";

export const dynamic = "force-dynamic";

export default function AdminPipelineStagesPage() {
  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">
        Pipeline Stages
      </h1>
      <PipelineStagesPanel />
    </div>
  );
}
