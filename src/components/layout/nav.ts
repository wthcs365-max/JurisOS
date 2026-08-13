// Shared navigation config for the side nav and the Cmd+K command palette.

export type NavItem = {
  to: string;
  label: string;
  icon: string;
  section?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "scale" },
  { to: "/matters", label: "Matters", icon: "file" },
  { to: "/drafting", label: "Drafting", icon: "pen" },
  { to: "/library", label: "Library", icon: "library" },
  { to: "/bundles", label: "Bundles", icon: "bundle" },
  { to: "/efiling", label: "eFiling", icon: "efiling" },
  { to: "/sheriffs", label: "Sheriffs", icon: "sheriffs" },
  { to: "/team", label: "Team", icon: "users" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export type Command = {
  id: string;
  label: string;
  hint: string;
  to?: string; // route to navigate to
  stub?: boolean; // real flow lands with a later screen
  group: "Navigate" | "Actions";
};

export const COMMANDS: Command[] = [
  ...NAV_ITEMS.map((n) => ({
    id: `nav-${n.to}`,
    label: `Go to ${n.label}`,
    hint: n.to === "/" ? "Dashboard" : n.label,
    to: n.to,
    group: "Navigate" as const,
  })),
  {
    id: "act-poc",
    label: "Draft POC",
    hint: "Draft particulars of claim",
    to: "/drafting",
    stub: true,
    group: "Actions",
  },
  {
    id: "act-file",
    label: "File Matter",
    hint: "Create a new matter / file at court",
    to: "/matters",
    stub: true,
    group: "Actions",
  },
  {
    id: "act-deadline",
    label: "Add Deadline",
    hint: "Add a deadline to a matter",
    to: "/matters",
    stub: true,
    group: "Actions",
  },
];
