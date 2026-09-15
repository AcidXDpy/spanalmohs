import { Clapperboard } from "lucide-react";

import { FilmAnalysisWorkbench } from "@/components/analytics/film-analysis-workbench";
import { PageHeader } from "@/components/analytics/page-header";
import {
  sampleFilmAutomationSuggestions,
  sampleFilmClips,
  sampleFilmVideos,
  sampleVisionDetections,
} from "@/lib/data/sample-film";
import { getAnalyticsDataset } from "@/lib/data/repository";

export default function FilmPage() {
  const dataset = getAnalyticsDataset();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Film Review"
        title="Video Tagging, OCR Suggestions, Computer Vision Review, and Clip-Linked Stats"
        description="Game footage becomes structured play data through manual tagging, semi-automated scoreboard and timing signals, and computer-vision detections prepared for coach review."
        badge={`${sampleFilmClips.length} Film Clips`}
        icon={Clapperboard}
      />

      <FilmAnalysisWorkbench
        videos={sampleFilmVideos}
        initialClips={sampleFilmClips}
        automationSuggestions={sampleFilmAutomationSuggestions}
        visionDetections={sampleVisionDetections}
        players={dataset.players}
      />
    </div>
  );
}
