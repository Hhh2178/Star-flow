import type { AdminRole } from "../shared/auth";

export interface AdminNavigationItem {
  key: string;
  routeName: string;
  label: string;
  path: string;
  icon: string;
  roles: readonly AdminRole[];
}

const allAdminRoles = ["admin", "super_admin"] as const;
const superAdminOnly = ["super_admin"] as const;

export const adminNavigationCatalog: readonly AdminNavigationItem[] = [
  { key: "overview", routeName: "home", label: "总览", path: "/", icon: "i-dashboard-one", roles: allAdminRoles },
  { key: "groups", routeName: "groups", label: "分组管理", path: "/groups", icon: "i-peoples", roles: superAdminOnly },
  { key: "users", routeName: "users", label: "用户管理", path: "/users", icon: "i-user", roles: allAdminRoles },
  { key: "projects", routeName: "projects", label: "项目监管", path: "/projects", icon: "i-folder-open", roles: allAdminRoles },
  { key: "tasks", routeName: "tasks", label: "任务监控", path: "/tasks", icon: "i-list-view", roles: allAdminRoles },
  { key: "queue", routeName: "queue", label: "队列与并发", path: "/queue", icon: "i-list", roles: allAdminRoles },
  { key: "usage", routeName: "usage", label: "成本与用量", path: "/usage", icon: "i-chart-histogram", roles: allAdminRoles },
  { key: "quota", routeName: "quota", label: "额度与充值", path: "/quota", icon: "i-wallet", roles: allAdminRoles },
  { key: "providers", routeName: "providers", label: "Provider 与模型", path: "/providers", icon: "i-api", roles: allAdminRoles },
  { key: "ai-config", routeName: "ai-config", label: "AI 全局配置", path: "/ai-config", icon: "i-brain", roles: allAdminRoles },
  { key: "system", routeName: "system", label: "系统设置", path: "/system", icon: "i-setting-two", roles: superAdminOnly },
  { key: "audit", routeName: "audit", label: "审计日志", path: "/audit", icon: "i-log", roles: allAdminRoles },
  { key: "profile", routeName: "profile", label: "个人中心", path: "/profile", icon: "i-user-positioning", roles: allAdminRoles },
];

export function getAdminNavigation(
  role: AdminRole,
  registeredRouteNames: ReadonlySet<string>,
): AdminNavigationItem[] {
  return adminNavigationCatalog.filter(
    (item) => registeredRouteNames.has(item.routeName) && item.roles.includes(role),
  );
}
