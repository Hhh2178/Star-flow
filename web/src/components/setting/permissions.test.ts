import { describe, expect, it } from "vitest";
import { getVisibleSettingMenuItems } from "./permissions";

const personalKeys = ["ui", "language", "loginConfig", "about", "logoutConfig"];

describe("Creator 设置中心边界", () => {
  it.each(["creator", "admin", "super_admin"] as const)("%s 只看到个人设置", (role) => {
    expect(getVisibleSettingMenuItems(role).map((item) => item.key)).toEqual(personalKeys);
  });

  it("不包含全局配置或账号管理入口", () => {
    const visible = new Set(getVisibleSettingMenuItems("super_admin").map((item) => item.key));
    for (const key of [
      "vendorConfig",
      "modelMap",
      "agentConfog",
      "promptManage",
      "skillManagement",
      "memoryConfig",
      "userManagement",
      "dbConfig",
      "fileManagement",
      "otherConfig",
      "requestConfig",
      "devConfig",
    ]) {
      expect(visible.has(key)).toBe(false);
    }
  });
});
