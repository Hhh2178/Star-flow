import type { UserRole } from "@/stores/user";

export type SettingMenuItem = {
  key: string;
  label: string;
  icon: string;
  roles: UserRole[];
};

const allRoles: UserRole[] = ["super_admin", "admin", "creator"];

export const settingMenuItems: SettingMenuItem[] = [
  { key: "ui", label: "settings.menu.ui", icon: "i-theme", roles: allRoles },
  { key: "language", label: "settings.menu.language", icon: "i-translate", roles: allRoles },
  { key: "loginConfig", label: "settings.menu.loginConfig", icon: "i-user", roles: allRoles },
  { key: "about", label: "settings.menu.about", icon: "i-info", roles: allRoles },
  { key: "logoutConfig", label: "settings.menu.logoutConfig", icon: "i-logout", roles: allRoles },
];

export function getVisibleSettingMenuItems(role: UserRole = "creator") {
  return settingMenuItems.filter((item) => item.roles.includes(role));
}
