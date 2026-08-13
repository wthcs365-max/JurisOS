import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/team")({
  component: () => (
    <PlaceholderPage
      title="Team"
      icon="users"
      milestone="Screen 12"
      description="Firm members, roles and matter assignment."
    />
  ),
});
