import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/matters")({
  component: () => (
    <PlaceholderPage
      title="Matters OS"
      icon="file"
      milestone="Screen 2"
      description="Three-panel matters list, detail and actions with an auto-logged timeline. Landing here from the dashboard for now."
    />
  ),
});
