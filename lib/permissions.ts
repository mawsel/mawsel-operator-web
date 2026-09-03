import type { UserRole } from "@/lib/types";

export type Permission = "dispatch:write" | "fleet:write" | "zones:write" | "configuration:write" | "administration:write";

const permissions: Record<Permission, UserRole[]> = {
  "dispatch:write": ["Dispatcher", "Operations Manager", "Administrator", "Super Administrator"],
  "fleet:write": ["Fleet Manager", "Operations Manager", "Administrator", "Super Administrator"],
  "zones:write": ["Operations Manager", "Administrator", "Super Administrator"],
  "configuration:write": ["Operations Manager", "Administrator", "Super Administrator"],
  "administration:write": ["Administrator", "Super Administrator"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return permissions[permission].includes(role);
}