import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { ADMIN_HISTORY_BASE, adminRoutes } from "../router";
import { ADMIN_ROUTE_ACCESS, decideAdminGuard } from "../router-policy";

describe("admin route policy", () => {
  it("uses the /admin/ history base and registers the first operations pages", () => {
    const layoutRoute = adminRoutes.find((route) => route.name === "layout");

    expect(ADMIN_HISTORY_BASE).toBe("/admin/");
    expect(layoutRoute?.children?.map((route) => route.name)).toEqual(["home", "groups", "users", "projects", "tasks", "queue", "usage", "quota", "audit"]);
    expect(
      layoutRoute?.children
        ?.filter((route) => ["queue", "quota", "audit"].includes(String(route.name)))
        .every((route) => route.meta?.roles?.join(",") === "admin,super_admin"),
    ).toBe(true);
  });

  it("redirects unfinished direct routes to the safe home fallback", async () => {
    const fallbackRoute = adminRoutes.find((route) => route.path === "/:pathMatch(.*)*");
    const router = createRouter({
      history: createMemoryHistory(ADMIN_HISTORY_BASE),
      routes: adminRoutes,
    });

    expect(adminRoutes.some((route) => route.path === "/providers")).toBe(false);
    expect(fallbackRoute?.redirect).toBe("/");
    await router.push("/providers");
    expect(router.currentRoute.value).toMatchObject({ path: "/", name: "home" });
  });

  it.each(["projects", "tasks", "usage"])("allows both admin roles on %s monitoring", (routeName) => {
    const layoutRoute = adminRoutes.find((route) => route.name === "layout");
    expect(layoutRoute?.children?.find((route) => route.name === routeName)?.meta?.roles).toEqual(["admin", "super_admin"]);
  });

  it("registers groups for Super Admin and users for both admin roles", () => {
    const layoutRoute = adminRoutes.find((route) => route.name === "layout");
    expect(layoutRoute?.children?.find((route) => route.name === "groups")?.meta?.roles).toEqual(["super_admin"]);
    expect(layoutRoute?.children?.find((route) => route.name === "users")?.meta?.roles).toEqual(["admin", "super_admin"]);
  });

  it.each(["queue", "quota", "audit"])("allows both admin roles on %s", (routeName) => {
    const layoutRoute = adminRoutes.find((route) => route.name === "layout");
    expect(layoutRoute?.children?.find((route) => route.name === routeName)?.meta?.roles).toEqual([
      "admin",
      "super_admin",
    ]);
  });

  it("marks login and forbidden as public routes", () => {
    expect(ADMIN_ROUTE_ACCESS.login.public).toBe(true);
    expect(ADMIN_ROUTE_ACCESS.forbidden.public).toBe(true);
  });

  it("marks group and system routes as super-admin only", () => {
    expect(ADMIN_ROUTE_ACCESS.groups.roles).toEqual(["super_admin"]);
    expect(ADMIN_ROUTE_ACCESS.system.roles).toEqual(["super_admin"]);
  });

  it("redirects an anonymous direct visit to login", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "anonymous" },
        requiredRoles: ["admin", "super_admin"],
      }),
    ).toEqual({ type: "redirect", to: "login" });
  });

  it("redirects a creator rejected during restore to forbidden", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "forbidden" },
        requiredRoles: ["admin", "super_admin"],
      }),
    ).toEqual({ type: "redirect", to: "forbidden" });
  });

  it("blocks an admin from a super-admin route reached by URL", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "authenticated", role: "admin" },
        requiredRoles: ADMIN_ROUTE_ACCESS.groups.roles,
      }),
    ).toEqual({ type: "redirect", to: "forbidden" });
  });

  it("allows an authenticated role accepted by route meta", () => {
    expect(
      decideAdminGuard({
        publicRoute: false,
        auth: { status: "authenticated", role: "admin" },
        requiredRoles: ADMIN_ROUTE_ACCESS.home.roles,
      }),
    ).toEqual({ type: "allow" });
  });
});
