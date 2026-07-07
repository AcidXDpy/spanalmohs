"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-200" />
          Analytics Workspace Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          The current view could not render. The data layer is still intact; retry the route after checking the
          import or model configuration.
        </p>
        <pre className="overflow-auto rounded-md border bg-background p-3 text-xs text-muted-foreground">
          {error.message}
        </pre>
        <Button onClick={reset}>Retry</Button>
      </CardContent>
    </Card>
  );
}
