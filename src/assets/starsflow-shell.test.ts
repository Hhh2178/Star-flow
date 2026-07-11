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

  it("does not expose test credentials or Creator-side global configuration guidance", () => {
    const login = read("../pages/login/index.vue");
    const workbench = read("../pages/workbench/index.vue");
    const localeDirectory = fileURLToPath(new URL("../locales/language/", import.meta.url));
    const localeText = fs.readdirSync(localeDirectory)
      .filter((name) => name.endsWith(".json"))
      .map((name) => fs.readFileSync(`${localeDirectory}/${name}`, "utf8"))
      .join("\n");

    expect(login).not.toContain('$t("login.tips")');
    expect(workbench).not.toContain("<hello />");
    expect(workbench).not.toContain('import hello from "@/components/hello.vue"');
    expect(fs.existsSync(fileURLToPath(new URL("../components/hello.vue", import.meta.url)))).toBe(false);
    expect(localeText).not.toMatch(/admin123/i);
    expect(localeText).not.toContain('"hello": {');
    expect(localeText).not.toMatch(/configModelTitle|configModelBtn|configAgentBtn/);
  });

  it("contains the Creator workspace width and project-card text tracks", () => {
    const workbench = read("../pages/workbench/index.vue");
    const project = read("../views/project/index.vue");

    expect(workbench).toContain("width: 100%;");
    expect(workbench).not.toContain("width: 100vw;");
    expect(workbench).toMatch(/\.view\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*auto;/);
    expect(project).toContain('class="cardHeader"');
    expect(project).toContain("grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))");
    expect(project).toMatch(/\.cardHeader\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  });
});
