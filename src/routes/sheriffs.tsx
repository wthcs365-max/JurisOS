import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/sheriffs")({
  component: () => (
    <PlaceholderPage
      title="Sheriffs"
      icon="sheriffs"
      milestone="Screen 9"
      description="Assign service of process to sheriff's offices and track returns of service."
    />
  ),
});
