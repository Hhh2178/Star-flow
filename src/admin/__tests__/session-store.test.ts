import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../shared/api", () => ({
  createApiClient: () => api,
}));

import { useAdminSessionStore } from "../session";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const adminSession = {
  id: 2,
  name: "组管理员",
  role: "admin" as const,
  groupId: 3,
  groupName: "内容一组",
};

describe("admin session store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", new MemoryStorage());
    setActivePinia(createPinia());
  });

  it("logs in, stores the token, and then fetches the admin session", async () => {
    api.post.mockResolvedValue({
      data: {
        code: 200,
        data: { token: "Bearer admin-token", id: 2, name: "组管理员", role: "admin" },
        message: "登录成功",
      },
    });
    api.get.mockResolvedValue({
      data: { code: 200, data: adminSession, message: "成功" },
    });
    const store = useAdminSessionStore();

    await expect(store.login({ username: "admin", password: "secret" })).resolves.toEqual(adminSession);

    expect(api.post).toHaveBeenCalledWith("/login/login", {
      username: "admin",
      password: "secret",
    });
    expect(api.get).toHaveBeenCalledWith("/admin/auth/session");
    expect(localStorage.getItem("token")).toBe("Bearer admin-token");
    expect(store.session).toEqual(adminSession);
  });

  it("restores an admin session from a persisted token after refresh", async () => {
    localStorage.setItem("token", "Bearer persisted-token");
    api.get.mockResolvedValue({
      data: { code: 200, data: adminSession, message: "成功" },
    });
    const store = useAdminSessionStore();

    await expect(store.restore()).resolves.toBe("authenticated");
    expect(store.session).toEqual(adminSession);
  });

  it("clears the token and reports a Chinese permission error for a creator", async () => {
    api.post.mockResolvedValue({
      data: {
        code: 200,
        data: { token: "Bearer creator-token", id: 9, name: "创作者", role: "creator" },
        message: "登录成功",
      },
    });
    api.get.mockRejectedValue({
      status: 403,
      message: "当前账号不能进入管理后台",
    });
    const store = useAdminSessionStore();

    await expect(store.login({ username: "creator", password: "secret" })).rejects.toThrow(
      "当前账号无权进入管理后台",
    );
    expect(localStorage.getItem("token")).toBeNull();
    expect(store.session).toBeNull();
    expect(store.errorMessage).toBe("当前账号无权进入管理后台");
  });

  it("keeps the backend error when login itself returns 403", async () => {
    api.post.mockRejectedValue({
      status: 403,
      message: "账号已停用，请联系管理员",
    });
    const store = useAdminSessionStore();

    await expect(store.login({ username: "disabled", password: "secret" })).rejects.toThrow(
      "账号已停用，请联系管理员",
    );
    expect(store.errorMessage).toBe("账号已停用，请联系管理员");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("clears the session when restore receives 401", async () => {
    localStorage.setItem("token", "Bearer expired-token");
    api.get.mockRejectedValue({ status: 401, message: "无效的token" });
    const store = useAdminSessionStore();

    await expect(store.restore()).resolves.toBe("anonymous");
    expect(localStorage.getItem("token")).toBeNull();
    expect(store.session).toBeNull();
  });

  it("logs out locally", () => {
    localStorage.setItem("token", "Bearer admin-token");
    const store = useAdminSessionStore();

    store.logout();

    expect(localStorage.getItem("token")).toBeNull();
    expect(store.token).toBeNull();
    expect(store.session).toBeNull();
  });
});
