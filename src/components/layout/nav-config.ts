import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import type { Role } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * Single source of truth for navigation. Items carry the roles that may see
 * them, so the sidebar, the mobile drawer and the bottom bar can never drift
 * apart — and a teacher never sees an admin-only link (§9).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "TEACHER", "STUDENT"],
      },
    ],
  },
  {
    label: "Teaching",
    items: [
      {
        href: "/classes",
        label: "Classes",
        icon: BookOpen,
        roles: ["ADMIN", "TEACHER", "STUDENT"],
      },
      {
        href: "/students",
        label: "Students",
        icon: Users,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href: "/teachers",
        label: "Teachers",
        icon: GraduationCap,
        roles: ["ADMIN"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        roles: ["ADMIN", "TEACHER"],
      },
    ],
  },
  {
    label: null,
    items: [
      {
        href: "/settings",
        label: "Settings",
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

/** The four most useful destinations on a phone's bottom bar (§51). */
export function primaryNavForRole(role: Role): NavItem[] {
  return navGroupsForRole(role)
    .flatMap((group) => group.items)
    .slice(0, 4);
}
