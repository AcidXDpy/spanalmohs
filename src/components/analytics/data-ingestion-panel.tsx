"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateCsvHeaders } from "@/lib/validation/data-quality";

interface CsvSchema {
  entity: string;
  requiredColumns: string[];
  optionalColumns: string[];
}

function firstCsvLine(text: string) {
  return text.split(/\r?\n/).find(Boolean) ?? "";
}

function parseHeaders(text: string) {
  return firstCsvLine(text)
    .split(",")
    .map((header) => header.trim())
    .filter(Boolean);
}

export function DataIngestionPanel({ schemas }: { schemas: CsvSchema[] }) {
  const [schemaEntity, setSchemaEntity] = useState(schemas[0]?.entity ?? "Players");
  const [csvText, setCsvText] = useState("");
  const schema = schemas.find((item) => item.entity === schemaEntity) ?? schemas[0]!;
  const validation = validateCsvHeaders(parseHeaders(csvText), schema.requiredColumns);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Upload className="size-4" />
          CSV Upload and Manual Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={schemaEntity} onValueChange={setSchemaEntity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((item) => (
                  <SelectItem key={item.entity} value={item.entity}>
                    {item.entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setCsvText(await file.text());
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Required Columns</Label>
            <div className="flex flex-wrap gap-2">
              {schema.requiredColumns.map((column) => (
                <Badge key={column} variant="outline" className="font-mono">
                  {column}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Paste CSV Header or Rows</Label>
          <Textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="min-h-40 font-mono text-xs"
            placeholder={schema.requiredColumns.join(",")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={validation.valid ? "outline" : "destructive"}>
              {validation.valid ? "Schema Valid" : "Missing Required Columns"}
            </Badge>
            {!validation.valid &&
              validation.missingColumns.map((column) => (
                <Badge key={column} variant="outline" className="border-amber-300/30 text-amber-200">
                  {column}
                </Badge>
              ))}
            <Button size="sm" variant="outline" disabled={!validation.valid}>
              Stage Import
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
