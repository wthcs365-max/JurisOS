import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/settings")({
  component: () => (
    <PlaceholderPage
      title="Settings"
      icon="settings"
      milestone="Screen 13"
      description="Firm profile, courts, deadline rule preferences and sync controls."
    />
  ),
});
