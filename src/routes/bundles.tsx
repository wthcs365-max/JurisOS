import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/bundles")({
  component: () => (
    <PlaceholderPage
      title="Bundles"
      icon="bundle"
      milestone="Screen 7"
      description="Assemble paginated court bundles from matter documents with an index."
    />
  ),
});
