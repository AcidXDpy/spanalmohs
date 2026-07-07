import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchX className="size-4" />
          Route Not Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This analytics module is not registered in the current Mount Olive SPANAL build.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to Command Center</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
