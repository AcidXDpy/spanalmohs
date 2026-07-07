import { FileText } from "lucide-react";

import { PageHeader } from "@/components/analytics/page-header";
import { PrintReportButton } from "@/components/analytics/print-report-button";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDataset } from "@/lib/data/repository";
import { calculateTeamMetrics, getReportCatalog } from "@/lib/stats/football";

export default function ReportsPage() {
  const dataset = getAnalyticsDataset();
  const reports = getReportCatalog(dataset);
  const metrics = calculateTeamMetrics(dataset).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Browser-Ready PDF-Style Reports for Coaches and Analysts"
        description="Generate weekly team reports, opponent scouting reports, player development reports, game recaps, and season analytics summaries with charts, tables, model outputs, and methodology notes."
        badge="Printable"
        icon={FileText}
      />

      <div className="flex justify-end">
        <PrintReportButton />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">{report.scope}</div>
                </div>
                <Badge variant="outline">{report.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <p className="text-muted-foreground">{report.insight}</p>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Included</div>
                <div>{report.included}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Season Analytics Report Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SimpleDataTable
            dense
            rows={metrics}
            columns={[
              { key: "metric", header: "Metric", cell: (row) => row.name },
              { key: "value", header: "Value", cell: (row) => <span className="font-mono">{row.formattedValue}</span> },
              { key: "confidence", header: "Reliability", cell: (row) => `${Math.round(row.confidence * 100)}%` },
              { key: "method", header: "Methodology", cell: (row) => row.formula },
            ]}
          />
          <div className="grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <div className="mb-1 text-foreground">Plain-English Insight</div>
              Drive efficiency and red-zone execution are the strongest current team signals.
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="mb-1 text-foreground">Model Output</div>
              ML reports include Train/Test split, validation metrics, Feature Importance, and small-sample warnings.
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="mb-1 text-foreground">Credibility Note</div>
              Demo data is clearly marked. Real CSV imports should replace the sample before operational decisions.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
