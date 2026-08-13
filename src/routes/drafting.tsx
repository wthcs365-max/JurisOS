import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/drafting")({
  component: () => (
    <PlaceholderPage
      title="AI Drafting Studio"
      icon="pen"
      milestone="Screen 4"
      description="Template-driven drafting with side-by-side prompt and generated output. Quick Draft from the dashboard lands here."
    />
  ),
});
