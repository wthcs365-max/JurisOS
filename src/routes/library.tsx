import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "~/components/PlaceholderPage";

export const Route = createFileRoute("/library")({
  component: () => (
    <PlaceholderPage
      title="Law Library"
      icon="library"
      milestone="Screen 5"
      description="Searchable statutes, rules and practice notes for South African courts."
    />
  ),
});
