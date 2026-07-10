import { describe, expect, it } from "vitest";
import { adminNavigationCatalog, getAdminNavigation } from "../navigation";

describe("admin navigation", () => {
  it.each(["admin", "super_admin"] as const)("shows only implemented entries to %s", (role) => {
    expect(getAdminNavigation(role).map((item) => item.label)).toEqual(["总览"]);
  });

  it("keeps future entries in a non-visible catalog", () => {
    expect(adminNavigationCatalog.map((item) => item.label)).toContain("分组管理");
    expect(adminNavigationCatalog.map((item) => item.label)).toContain("个人中心");
  });
});
