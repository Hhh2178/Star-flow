import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Stars Flow application shells", () => {
  it("uses the luminous page environment on Creator login and workbench", () => {
    const login = read("../pages/login/index.vue");
    const workbench = read("../pages/workbench/index.vue");

    expect(login).toContain("background: var(--stars-page-gradient)");
    expect(login).toContain("border: 1px solid var(--stars-border)");
    expect(workbench).toContain("background: var(--stars-page-gradient)");
    expect(workbench).toContain("border-radius: var(--stars-radius-panel)");
    expect(workbench).toContain("background: var(--stars-brand-gradient)");
  });

  it("uses the shared brand identity and light luminous Admin shell", () => {
    const admin = read("../admin/components/AdminLayout.vue");
    const adminLogin = read("../admin/pages/AdminLogin.vue");

    expect(admin).toContain("<BrandIdentity compact show-descriptor />");
    expect(admin).toContain('import BrandIdentity from "../../components/brand/BrandIdentity.vue"');
    expect(admin).toContain("background: var(--stars-page-gradient)");
    expect(admin).toContain("background: rgba(255, 255, 255, 0.92)");
    expect(admin).not.toMatch(/#17211f|#5eead4|#9fb1ad|#c6d1ce/i);
    expect(adminLogin).toContain("<BrandIdentity show-descriptor />");
    expect(adminLogin).toContain("background: var(--stars-page-gradient)");
    expect(adminLogin).not.toMatch(/#17211f|#5eead4|#f3f6f5/i);
  });
});
