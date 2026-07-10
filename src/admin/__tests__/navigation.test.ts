import { describe, expect, it } from "vitest";
import { adminNavigationCatalog, getAdminNavigation } from "../navigation";

describe("admin navigation", () => {
  it.each(["admin", "super_admin"] as const)("shows only implemented entries to %s", (role) => {
    expect(getAdminNavigation(role, new Set(["home"])).map((item) => item.label)).toEqual(["总览"]);
  });

  it("automatically exposes a future registered route only to an allowed role", () => {
    const registeredRouteNames = new Set(["home", "groups"]);

    expect(getAdminNavigation("super_admin", registeredRouteNames).map((item) => item.label)).toEqual([
      "总览",
      "分组管理",
    ]);
    expect(getAdminNavigation("admin", registeredRouteNames).map((item) => item.label)).toEqual(["总览"]);
    expect(adminNavigationCatalog.find((item) => item.key === "groups")).toMatchObject({
      routeName: "groups",
    });
  });

  it.each(["admin", "super_admin"] as const)("automatically shows registered operations pages to %s", (role) => {
    const labels = getAdminNavigation(role, new Set(["home", "queue", "quota", "audit"]))
      .map((item) => item.label);

    expect(labels).toEqual(["总览", "队列与并发", "额度与充值", "审计日志"]);
  });
});
