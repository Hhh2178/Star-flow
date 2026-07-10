import type { AdminRole } from "../shared/auth";

export interface AdminNavigationItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  roles: readonly AdminRole[];
}

const allAdminRoles = ["admin", "super_admin"] as const;
const superAdminOnly = ["super_admin"] as const;

export const adminNavigation: readonly AdminNavigationItem[] = [
  { key: "overview", label: "总览", path: "/", icon: "i-dashboard-one", roles: allAdminRoles },
  { key: "groups", label: "分组管理", path: "/groups", icon: "i-peoples", roles: superAdminOnly },
  { key: "users", label: "用户管理", path: "/users", icon: "i-user", roles: allAdminRoles },
  { key: "projects", label: "项目监管", path: "/projects", icon: "i-folder-open", roles: allAdminRoles },
  { key: "tasks", label: "任务监控", path: "/tasks", icon: "i-list-view", roles: allAdminRoles },
  { key: "queue", label: "队列与并发", path: "/queue", icon: "i-list", roles: allAdminRoles },
  { key: "usage", label: "成本与用量", path: "/usage", icon: "i-chart-histogram", roles: allAdminRoles },
  { key: "quota", label: "额度与充值", path: "/quota", icon: "i-wallet", roles: allAdminRoles },
  { key: "providers", label: "Provider 与模型", path: "/providers", icon: "i-api", roles: allAdminRoles },
  { key: "ai-config", label: "AI 全局配置", path: "/ai-config", icon: "i-brain", roles: allAdminRoles },
  { key: "system", label: "系统设置", path: "/system", icon: "i-setting-two", roles: superAdminOnly },
  { key: "audit", label: "审计日志", path: "/audit", icon: "i-log", roles: allAdminRoles },
  { key: "profile", label: "个人中心", path: "/profile", icon: "i-user-positioning", roles: allAdminRoles },
];

export function getAdminNavigation(role: AdminRole): AdminNavigationItem[] {
  return adminNavigation.filter((item) => item.roles.includes(role));
}
