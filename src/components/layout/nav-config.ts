import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, Settings, Users } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/translate";
import type { Role } from "@/types/database";

/**
 * Nav entries carry a dictionary key rather than a finished string: this
 * module is imported by both the sidebar and the bottom bar, and neither can
 * be handed a per-request dictionary at module scope.
 */
type NavKey = keyof Dictionary["nav"];

export interface NavItem {
  href: string;
  labelKey: NavKey;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  labelKey: NavKey | null;
  items: NavItem[];
}

/**
 * Single source of truth for navigation. Items carry the roles that may see
 * them, so the sidebar, the mobile drawer and the bottom bar can never drift
 * apart — and a teacher never sees an admin-only link (§9).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: null,
    items: [
      {
        href: "/dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "TEACHER", "STUDENT"],
      },
    ],
  },
  {
    labelKey: "groupTeaching",
    items: [
      {
        href: "/classes",
        labelKey: "classes",
        icon: BookOpen,
        roles: ["ADMIN", "TEACHER", "STUDENT"],
      },
      {
        href: "/students",
        labelKey: "students",
        icon: Users,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    labelKey: "groupManagement",
    items: [
      {
        href: "/teachers",
        labelKey: "teachers",
        icon: GraduationCap,
        roles: ["ADMIN"],
      },
      {
        href: "/reports",
        labelKey: "reports",
        icon: BarChart3,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    labelKey: null,
    items: [
      {
        href: "/settings",
        labelKey: "settings",
        icon: Settings,
        roles: ["ADMIN", "TEACHER", "STUDENT"],
      },
    ],
  },
];

export function navGroupsForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/**
 * The phone bottom bar (§51). It is the only navigation on mobile, so it
 * carries every destination the role has rather than a truncated few —
 * except Settings, which already sits in the account menu and would
 * otherwise push admins to a sixth cramped column.
 */
export function primaryNavForRole(role: Role): NavItem[] {
  return navGroupsForRole(role)
    .flatMap((group) => group.items)
    .filter((item) => item.href !== "/settings");
}
