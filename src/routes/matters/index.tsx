import { createFileRoute } from "@tanstack/react-router";
import { listMatters } from "~/lib/server/matters";
import type { MatterListItem } from "~/lib/server/matters";
import { AppShell } from "~/components/layout/AppShell";
import { MattersWorkspace } from "~/components/matters/MattersWorkspace";

type LoaderData = MatterListItem[] | { error: string };

export const Route = createFileRoute("/matters/")({
  // `?new=1` (or ?new=true) opens the New Matter form — wired from the
  // Dashboard's "Create New Matter" button.
  validateSearch: (search: Record<string, unknown>): { new?: boolean } => ({
    new: search.new === true || search.new === "1" || search.new === "true" ? true : undefined,
  }),
  loader: async (): Promise<LoaderData> => {
    try {
      return await listMatters({ data: { search: "", filter: "all" } });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },
  component: MattersIndexPage,
});

function MattersIndexPage() {
  const data = Route.useLoaderData();
  const { new: newRequested } = Route.useSearch();

  return (
    <AppShell>
      <MattersWorkspace
        selectedMatterId={null}
        initialDetail={null}
        initialMatters={Array.isArray(data) ? data : null}
        initialListError={Array.isArray(data) ? null : data.error}
        newRequested={newRequested === true}
      />
    </AppShell>
  );
}
