"use client";

import { useMemo, useState } from "react";
import { Download, FlaskConical, Info } from "lucide-react";

import { AnalyticsBarChart } from "@/components/charts/analytics-bar-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import {
  defaultFeatureSet,
  modelOptions,
  runModel,
  targetOptions,
  type MlModelKind,
} from "@/lib/ml/algorithms";
import type { ModelFeatureRow } from "@/types";

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export function MlLabWorkbench({ rows }: { rows: ModelFeatureRow[] }) {
  const [modelKind, setModelKind] = useState<MlModelKind>("random-forest");
  const [target, setTarget] = useState("successful_drive");
  const [features, setFeatures] = useState(defaultFeatureSet.slice(0, 8));
  const [trainSplit, setTrainSplit] = useState([72]);

  const targetType = targetOptions.find((option) => option.value === target)?.type;
  const effectiveTarget =
    (modelKind === "logistic-regression" || modelKind === "decision-tree" || modelKind === "random-forest") &&
    targetType !== "binary"
      ? "successful_drive"
      : target;

  const report = useMemo(
    () =>
      runModel(rows, {
        kind: modelKind,
        target: effectiveTarget,
        features,
        trainRatio: trainSplit[0]! / 100,
      }),
    [effectiveTarget, features, modelKind, rows, trainSplit]
  );

  const chartRows = report.featureWeights
    .slice()
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8)
    .map((weight) => ({
      feature: labelize(weight.feature),
      value: Math.abs(weight.value),
    }));

  const exportText = [
    `Mount Olive SPANAL model report`,
    `Model: ${report.title}`,
    `Target: ${labelize(effectiveTarget)}`,
    `Features: ${features.map(labelize).join(", ")}`,
    `Warning: ${report.warning ?? "None"}`,
    `Metrics: ${report.metrics.map((metric) => `${metric.label} ${metric.value}`).join("; ")}`,
    `Explanation: ${report.explanation}`,
  ].join("\n");

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FlaskConical className="size-4" />
              Model controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={modelKind} onValueChange={(value) => setModelKind(value as MlModelKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {modelOptions.find((option) => option.value === modelKind)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Target variable</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {effectiveTarget !== target && (
                <p className="text-xs leading-5 text-amber-200">
                  Classification models are using scoring drive because the selected target is continuous.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Train/test split</Label>
                <span className="font-mono text-xs text-muted-foreground">{trainSplit[0]}%</span>
              </div>
              <Slider min={55} max={85} step={1} value={trainSplit} onValueChange={setTrainSplit} />
            </div>

            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid gap-2">
                {defaultFeatureSet.map((feature) => {
                  const checked = features.includes(feature);

                  return (
                    <label key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          if (value) {
                            setFeatures((current) => [...new Set([...current, feature])]);
                          } else {
                            setFeatures((current) => current.filter((item) => item !== feature));
                          }
                        }}
                      />
                      <span>{labelize(feature)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {report.warning && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>{report.warning}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          {report.metrics.map((metric) => (
            <Card key={metric.label} size="sm">
              <CardContent className="pt-1">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="mt-1 font-mono text-xl font-semibold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm">Feature importance</CardTitle>
                <Badge variant="outline">{report.title}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AnalyticsBarChart data={chartRows} xKey="feature" yKey="value" height={260} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Model explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{report.explanation}</p>
              <div className="space-y-2">
                {report.rules.slice(0, 5).map((rule) => (
                  <div key={rule} className="rounded-md border bg-background p-2 font-mono text-xs text-muted-foreground">
                    {rule}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([exportText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "mount-olive-spanal-model-report.txt";
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-4" />
                Export report
              </Button>
            </CardContent>
          </Card>
        </div>

        {report.clusters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cluster descriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDataTable
                dense
                rows={report.clusters}
                columns={[
                  { key: "id", header: "Cluster", cell: (row) => `#${row.id}` },
                  { key: "size", header: "Rows", cell: (row) => row.size },
                  { key: "description", header: "Description", cell: (row) => row.description },
                ]}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Validation predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={report.predictions.slice(-12)}
              columns={[
                { key: "label", header: "Row", cell: (row) => row.label },
                { key: "actual", header: "Actual", cell: (row) => row.actual },
                { key: "predicted", header: "Predicted", cell: (row) => row.predicted },
                { key: "split", header: "Split", cell: (row) => <Badge variant="outline">{row.split}</Badge> },
              ]}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
