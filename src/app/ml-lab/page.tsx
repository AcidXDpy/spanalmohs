import { BrainCircuit } from "lucide-react";

import { MlLabWorkbench } from "@/components/analytics/ml-lab-workbench";
import { PageHeader } from "@/components/analytics/page-header";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { buildModelingRows } from "@/lib/stats/football";

export default function MlLabPage() {
  const dataset = getAnalyticsDataset();
  const rows = buildModelingRows(dataset);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model Evaluation"
        title="Train, Validate, Interpret, and Export Exploratory Football Models"
        description="A modular modeling workflow for regression, probability estimation, decision rules, ensemble feature importance, and unsupervised drive clustering."
        badge={`${rows.length} Modeling Rows`}
        icon={BrainCircuit}
      />
      <MlLabWorkbench rows={rows} />
    </div>
  );
}
