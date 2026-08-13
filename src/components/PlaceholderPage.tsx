import { AppShell } from "~/components/layout/AppShell";
import { Badge, Card } from "~/components/ui";
import { Icon } from "~/components/icons";

/**
 * Lightweight placeholder for screens that ship in later milestones.
 * Each screen keeps its own route so the nav and Cmd+K stay fully clickable.
 */
export function PlaceholderPage({
  title,
  icon,
  milestone,
  description,
}: {
  title: string;
  icon: string;
  milestone: string;
  description: string;
}) {
  return (
    <AppShell pageTitle={title}>
      <Card className="p-10">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
            <Icon name={icon} className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-[15px] font-semibold text-slate-900">
            {title} — coming soon
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {description}
          </p>
          <div className="mt-4">
            <Badge tone="blue">{milestone}</Badge>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
