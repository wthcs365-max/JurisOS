import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/efiling")({
  component: () => (
    <PlaceholderPage
      title="eFiling"
      icon="efiling"
      milestone="Screen 8"
      description="Submit filings to CaseLines and the court eFiling portal, track proof of filing."
    />
  ),
});
