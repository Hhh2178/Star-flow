import { describe, expect, it } from "vitest";
import { getAdminNavigation } from "../navigation";

const allLabels = [
  "总览",
  "分组管理",
  "用户管理",
  "项目监管",
  "任务监控",
  "队列与并发",
  "成本与用量",
  "额度与充值",
  "Provider 与模型",
  "AI 全局配置",
  "系统设置",
  "审计日志",
  "个人中心",
];

describe("admin navigation", () => {
  it("reserves every requested operation entry for super admins", () => {
    expect(getAdminNavigation("super_admin").map((item) => item.label)).toEqual(allLabels);
  });

  it("hides super-admin-only entries from admins", () => {
    const labels = getAdminNavigation("admin").map((item) => item.label);

    expect(labels).not.toContain("分组管理");
    expect(labels).not.toContain("系统设置");
    expect(labels).toContain("Provider 与模型");
    expect(labels).toContain("AI 全局配置");
  });
});
