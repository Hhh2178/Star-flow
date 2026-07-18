import { describe, expect, it } from "vitest";
import type { AuthSession } from "../../shared/auth";
import { evaluateAdminSession } from "../session-policy";

function session(role: AuthSession["role"]): AuthSession {
  return {
    id: 7,
    name: "测试账号",
    role,
    groupId: role === "super_admin" ? null : 3,
    groupName: role === "super_admin" ? null : "内容一组",
  };
}

describe("admin session policy", () => {
  it.each(["admin", "super_admin"] as const)("accepts %s sessions", (role) => {
    expect(evaluateAdminSession(session(role))).toEqual({
      allowed: true,
      session: session(role),
    });
  });

  it("denies a creator session with a Chinese permission error", () => {
    expect(evaluateAdminSession(session("creator"))).toEqual({
      allowed: false,
      message: "当前账号无权进入管理后台",
    });
  });
});
