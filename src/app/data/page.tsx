import { Database } from "lucide-react";

import { DataIngestionPanel } from "@/components/analytics/data-ingestion-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { SimpleDataTable } from "@/components/tables/simple-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { csvImportSchemas, getAnalyticsDataset, getOpponentName } from "@/lib/data/repository";
import { statusLabel, titleCase } from "@/lib/format";
import { evaluateDataQuality, rosterStatusSummary } from "@/lib/validation/data-quality";

export default function DataHubPage() {
  const dataset = getAnalyticsDataset();
  const quality = evaluateDataQuality(dataset);
  const rosterStatus = rosterStatusSummary(dataset.players);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Hub"
        title="Upload, Validate, Edit, and Inspect the Analytics Source of Truth"
        description="A central intake layer for players, teams, games, opponents, plays, drives, stats, scouting notes, practices, injuries, and availability records."
        badge={`${Math.round(quality.overallCompleteness * 100)}% Complete`}
        icon={Database}
      />

      <DataIngestionPanel schemas={csvImportSchemas} />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Completeness Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quality.completenessScores.map((score) => (
              <div key={score.entity} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{titleCase(score.entity)}</span>
                  <span className="font-mono text-muted-foreground">
                    {Math.round(score.score * 100)}%
                  </span>
                </div>
                <Progress value={score.score * 100} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDataTable
              dense
              rows={quality.flags}
              columns={[
                {
                  key: "severity",
                  header: "Severity",
                  cell: (row) => <Badge variant={row.severity === "critical" ? "destructive" : "outline"}>{statusLabel(row.severity)}</Badge>,
                },
                { key: "entity", header: "Entity", cell: (row) => titleCase(row.entity) },
                { key: "message", header: "Flag", cell: (row) => row.message },
                { key: "recommendation", header: "Action", cell: (row) => row.recommendation },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {Object.entries(rosterStatus).map(([status, count]) => (
          <Card key={status} size="sm">
            <CardContent className="pt-1">
              <div className="text-xs text-muted-foreground">{statusLabel(status)}</div>
              <div className="mt-1 font-mono text-2xl font-semibold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="players">
            <TabsList className="mb-4 flex w-full flex-wrap justify-start">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="games">Games</TabsTrigger>
              <TabsTrigger value="plays">Plays</TabsTrigger>
              <TabsTrigger value="notes">Scouting</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>
            <TabsContent value="players">
              <SimpleDataTable
                dense
                rows={dataset.players}
                columns={[
                  { key: "number", header: "#", cell: (row) => row.number },
                  { key: "name", header: "Name", cell: (row) => row.name },
                  { key: "position", header: "Pos", cell: (row) => row.position },
                  { key: "class", header: "Class", cell: (row) => row.classYear },
                  { key: "status", header: "Status", cell: (row) => <Badge variant="outline">{statusLabel(row.status)}</Badge> },
                  { key: "archetype", header: "Archetype", cell: (row) => row.archetype },
                ]}
              />
            </TabsContent>
            <TabsContent value="games">
              <SimpleDataTable
                dense
                rows={dataset.games}
                columns={[
                  { key: "week", header: "Week", cell: (row) => row.week },
                  { key: "date", header: "Date", cell: (row) => row.date },
                  { key: "opponent", header: "Opponent", cell: (row) => getOpponentName(row.opponentId, dataset) },
                  { key: "score", header: "Score", cell: (row) => `${row.scoreFor}-${row.scoreAgainst}` },
                  { key: "result", header: "Result", cell: (row) => <Badge variant="outline">{row.result}</Badge> },
                  { key: "notes", header: "Notes", cell: (row) => row.notes },
                ]}
              />
            </TabsContent>
            <TabsContent value="plays">
              <SimpleDataTable
                dense
                rows={dataset.plays.slice(0, 24)}
                columns={[
                  { key: "id", header: "Play", cell: (row) => row.id },
                  { key: "down", header: "Down", cell: (row) => `${row.down}&${row.distance}` },
                  { key: "yard", header: "Yard", cell: (row) => row.yardLine },
                  { key: "type", header: "Type", cell: (row) => titleCase(row.playType) },
                  { key: "yards", header: "Yards", cell: (row) => row.yardsGained },
                  { key: "epa", header: "EPA", cell: (row) => <span className="font-mono">{row.epa}</span> },
                ]}
              />
            </TabsContent>
            <TabsContent value="notes">
              <SimpleDataTable
                dense
                rows={dataset.scoutingNotes}
                columns={[
                  { key: "category", header: "Category", cell: (row) => row.category },
                  { key: "note", header: "Note", cell: (row) => row.note },
                  { key: "confidence", header: "Confidence", cell: (row) => `${Math.round(row.confidence * 100)}%` },
                ]}
              />
            </TabsContent>
            <TabsContent value="availability">
              <SimpleDataTable
                dense
                rows={dataset.availabilityNotes}
                columns={[
                  { key: "date", header: "Date", cell: (row) => row.date },
                  { key: "player", header: "Player ID", cell: (row) => row.playerId },
                  { key: "status", header: "Status", cell: (row) => <Badge variant="outline">{statusLabel(row.status)}</Badge> },
                  { key: "note", header: "Note", cell: (row) => row.note },
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
