import { ShieldQuestion } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { calculateTeamMetrics } from "@/lib/stats/football";

const principles = [
  {
    title: "Small Sample Sizes Matter",
    body: "High-school football creates fewer observations than professional or college datasets. Confidence is discounted when the sample is small, volatile, or missing linked context.",
  },
  {
    title: "Correlation Is Not Causation",
    body: "A model can identify patterns such as pressure reducing drive success, but it does not prove pressure caused every failure. Film, opponent context, and coaching judgment remain necessary.",
  },
  {
    title: "Responsible Interpretation",
    body: "Analytics should support development and preparation, not label students permanently. Availability, role, scheme, and opportunity affect every player metric.",
  },
  {
    title: "Ethical Use",
    body: "Player health, privacy, and fairness should outrank model output. Injury or availability notes should be shared only with people who need them for legitimate team decisions.",
  },
  {
    title: "Model Limitations",
    body: "The initial models are exploratory because the demo dataset is intentionally small. Real CSV imports should expand the training sample before strategic reliance.",
  },
  {
    title: "Coach-Facing Outputs",
    body: "Recommendations are written as decision support. They should trigger better questions, practice plans, and scouting prep rather than automatic play calls.",
  },
];

export default function MethodologyPage() {
  const dataset = getAnalyticsDataset();
  const metrics = calculateTeamMetrics(dataset);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Methodology and Credibility"
        title="How the Platform Calculates, Trains, Validates, and Communicates Analytics"
        description="This page explains what each metric means, why it matters, how models are trained, how confidence is calculated, and how coaches should interpret outputs responsibly."
        badge="Transparent Methods"
        icon={ShieldQuestion}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {principles.map((principle) => (
          <Card key={principle.title}>
            <CardHeader>
              <CardTitle className="text-sm">{principle.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{principle.body}</CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Metric Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleDataTable
            dense
            rows={metrics}
            columns={[
              { key: "metric", header: "Metric", cell: (row) => row.name },
              { key: "meaning", header: "What It Means", cell: (row) => row.explanation },
              { key: "formula", header: "Formula / Method", cell: (row) => row.formula },
              { key: "confidence", header: "Reliability", cell: (row) => `${Math.round(row.confidence * 100)}%` },
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How Models Are Trained</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              The ML Lab converts drive records into feature rows. Selected features are standardized when required, split into train and test sets, and passed through the selected algorithm.
            </p>
            <p>
              Linear regression reports coefficients, R Squared, RMSE, and MAE. Logistic regression reports probability, accuracy, and Log Loss. Trees and forests report readable rules and Feature Importance. K-means reports centroids and cluster descriptions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Reliability Is Calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Metric confidence uses sample-size scaling against an ideal observation count, then discounts player ratings for volatility and availability risk.
            </p>
            <p>
              A 90% confidence badge does not mean a prediction has a 90% chance of being correct. It means the underlying metric has a stronger data foundation than lower-confidence outputs.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
