import { createFileRoute } from "@tanstack/react-router";
import { getMatterDetail } from "~/lib/server/matters";
import type { MatterDetail } from "~/lib/server/matters";
import { AppShell } from "~/components/layout/AppShell";
import { MattersWorkspace } from "~/components/matters/MattersWorkspace";

type LoaderData = MatterDetail | null | { error: string };

export const Route = createFileRoute("/matters/$matterId")({
  loader: async ({ params }): Promise<LoaderData> => {
    try {
      return await getMatterDetail({ data: { id: params.matterId } });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  },
  component: MatterDetailPage,
});

function MatterDetailPage() {
  const data = Route.useLoaderData();
  const { matterId } = Route.useParams();

  if (data !== null && typeof data === "object" && "error" in data) {
    return (
      <AppShell pageTitle="Matters">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Could not load this matter: {data.error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MattersWorkspace
        selectedMatterId={matterId}
        initialDetail={data}
        initialMatters={null}
        initialListError={null}
        newRequested={false}
      />
    </AppShell>
  );
}
