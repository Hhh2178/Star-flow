import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const theme = fs.readFileSync(fileURLToPath(new URL("./starsflow-theme.scss", import.meta.url)), "utf8");
const srcRoot = fileURLToPath(new URL("../", import.meta.url));

function collectVisualSources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return collectVisualSources(path);
    if (!/\.(?:css|scss|vue)$/.test(entry.name) || entry.name.endsWith(".test.ts")) return [];
    return [path];
  });
}

describe("Stars Flow luminous theme", () => {
  it("defines blue-violet environment, capsule and motion contracts", () => {
    expect(theme).toContain("--stars-page-bg: #f5f8ff");
    expect(theme).toContain("--stars-page-gradient: linear-gradient(135deg, #f8faff 0%, #edf4ff 58%, #f7f1ff 100%)");
    expect(theme).toContain("--stars-brand-gradient: linear-gradient(135deg, #2f7df4 0%, #7060f6 100%)");
    expect(theme).toContain("--stars-radius-control: 999px");
    expect(theme).toContain("--stars-motion-page: 220ms cubic-bezier(.2, .8, .2, 1)");
    expect(theme).toContain("@keyframes stars-page-enter");
    expect(theme).toContain("prefers-reduced-motion: reduce");
  });

  it("pairs primary and secondary action colors for readable controls", () => {
    expect(theme).toMatch(/\.t-button--theme-primary[\s\S]*background:\s*var\(--stars-brand-gradient\)[\s\S]*color:\s*#fff/);
    expect(theme).toMatch(/\.stars-button-secondary[\s\S]*background:\s*var\(--stars-surface\)[\s\S]*color:\s*var\(--stars-text\)/);
    expect(theme).toContain(".t-button .t-icon");
    expect(theme).toContain("color: inherit");
  });

  it("contains no green or teal action/status palette", () => {
    expect(theme).not.toMatch(/#0f766e|#115e59|#134e4a|#16a34a|#15803d|#14b8a6|#2dd4bf|15,\s*118,\s*110/i);
    expect(theme).toContain("--td-success-color: var(--stars-completed)");
    expect(theme).toContain("--stars-completed: #344054");
  });

  it("keeps known green and teal visual values out of Creator and Admin sources", () => {
    const forbidden = /#(?:0f766e|115e59|134e4a|16a34a|15803d|14b8a6|2dd4bf|10b981|059669|22c55e|00a870|008858|006c45|005334|003b23|002515|2ba471|56c08d|92dab2|c6f3d7|e3f9e9|237804)|rgba?\(15,\s*118,\s*110/i;
    const offenders = collectVisualSources(srcRoot).filter((path) => forbidden.test(fs.readFileSync(path, "utf8")));

    expect(offenders).toEqual([]);
  });
});
