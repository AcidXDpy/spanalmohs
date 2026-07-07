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
        eyebrow="Machine learning lab"
        title="Train, validate, interpret, and export exploratory football models"
        description="A modular modeling pipeline for regression, probability estimation, decision rules, ensemble feature importance, and unsupervised drive clustering."
        badge={`${rows.length} modeling rows`}
        icon={BrainCircuit}
      />
      <MlLabWorkbench rows={rows} />
    </div>
  );
}
