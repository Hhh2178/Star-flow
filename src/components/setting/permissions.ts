import type { UserRole } from "@/stores/user";

export type SettingMenuItem = {
  key: string;
  label: string;
  icon: string;
  roles: UserRole[];
};

const allRoles: UserRole[] = ["super_admin", "admin", "creator"];
const adminRoles: UserRole[] = ["super_admin", "admin"];
const superAdminRole: UserRole[] = ["super_admin"];

export const settingMenuItems: SettingMenuItem[] = [
  { key: "ui", label: "settings.menu.ui", icon: "i-theme", roles: allRoles },
  { key: "language", label: "settings.menu.language", icon: "i-translate", roles: allRoles },
  { key: "vendorConfig", label: "settings.menu.vendorConfig", icon: "i-computer", roles: superAdminRole },
  { key: "modelMap", label: "settings.menu.modelMap", icon: "i-connection-point", roles: superAdminRole },
  { key: "agentConfog", label: "settings.menu.agentConfig", icon: "i-color-filter", roles: superAdminRole },
  { key: "promptManage", label: "settings.menu.promptManage", icon: "i-tips", roles: adminRoles },
  { key: "skillManagement", label: "settings.menu.skillsSkillsManagement", icon: "i-ring", roles: adminRoles },
  { key: "memoryConfig", label: "settings.menu.memoryConfig", icon: "i-memory-card-one", roles: adminRoles },
  { key: "loginConfig", label: "settings.menu.loginConfig", icon: "i-user", roles: allRoles },
  { key: "userManagement", label: "settings.menu.userManagement", icon: "i-people", roles: adminRoles },
  { key: "dbConfig", label: "settings.menu.dbConfig", icon: "i-data", roles: superAdminRole },
  { key: "fileManagement", label: "settings.menu.fileManagement", icon: "i-hard-disk", roles: superAdminRole },
  { key: "otherConfig", label: "settings.menu.otherConfig", icon: "i-application-menu", roles: superAdminRole },
  { key: "requestConfig", label: "settings.menu.requestConfig", icon: "i-api", roles: superAdminRole },
  { key: "devConfig", label: "settings.menu.devConfig", icon: "i-flask", roles: superAdminRole },
  { key: "about", label: "settings.menu.about", icon: "i-info", roles: allRoles },
  { key: "logoutConfig", label: "settings.menu.logoutConfig", icon: "i-logout", roles: allRoles },
];

export function getVisibleSettingMenuItems(role: UserRole = "creator") {
  return settingMenuItems.filter((item) => item.roles.includes(role));
}
