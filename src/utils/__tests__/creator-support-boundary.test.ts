import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));

describe("Creator support and model boundaries", () => {
  it("工作台反馈只打开站内支持弹窗", async () => {
    const source = await readFile(`${root}/src/pages/workbench/index.vue`, "utf8");
    expect(source).toContain("SupportContactDialog");
    expect(source).not.toContain("docs.qq.com");
    expect(source).not.toContain("window.open(");
    expect(source).not.toContain("toonflow://openurlwithbrowser");
  });

  it("空模型提示联系管理员且不打开 Provider 设置", async () => {
    const source = await readFile(`${root}/src/components/modelSelect.vue`, "utf8");
    expect(source).toContain("当前暂无可用模型");
    expect(source).toContain("SupportContactDialog");
    expect(source).not.toContain("vendorConfig");
    expect(source).not.toContain("settingStore");
    expect(source).not.toContain("goVendorConfig");
  });
});
