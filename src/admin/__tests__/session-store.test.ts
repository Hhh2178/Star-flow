import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  options: null as null | { onUnauthorized?: (error: unknown) => void | Promise<void> },
}));

vi.mock("../../shared/api", () => ({
  createApiClient: (options: typeof api.options) => {
    api.options = options;
    return api;
  },
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

const newerAdminSession = {
  id: 5,
  name: "新管理员",
  role: "super_admin" as const,
  groupId: null,
  groupName: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("admin session store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.options = null;
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
    }, expect.objectContaining({ adminSessionGeneration: expect.any(Number) }));
    expect(api.get).toHaveBeenCalledWith(
      "/admin/auth/session",
      expect.objectContaining({
        adminSessionGeneration: expect.any(Number),
        headers: { Authorization: "Bearer admin-token" },
      }),
    );
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

  it("keeps the shared token when a successful session response has the creator role", async () => {
    api.post.mockResolvedValue({
      data: {
        code: 200,
        data: { token: "Bearer creator-token", id: 9, name: "创作者", role: "creator" },
        message: "登录成功",
      },
    });
    api.get.mockResolvedValue({
      data: {
        code: 200,
        data: {
          id: 9,
          name: "创作者",
          role: "creator",
          groupId: 3,
          groupName: "内容一组",
        },
        message: "成功",
      },
    });
    const store = useAdminSessionStore();

    await expect(store.login({ username: "creator", password: "secret" })).rejects.toThrow(
      "当前账号无权进入管理后台",
    );
    expect(localStorage.getItem("token")).toBe("Bearer creator-token");
    expect(store.session).toBeNull();
    expect(store.errorMessage).toBe("当前账号无权进入管理后台");
  });

  it("keeps a persisted token when restore is forbidden", async () => {
    localStorage.setItem("token", "Bearer creator-token");
    api.get.mockRejectedValue({ status: 403, message: "当前账号不能进入管理后台" });
    const store = useAdminSessionStore();

    await expect(store.restore()).resolves.toBe("forbidden");
    expect(localStorage.getItem("token")).toBe("Bearer creator-token");
    expect(store.token).toBe("Bearer creator-token");
    expect(store.session).toBeNull();
  });

  it("keeps the backend error when login itself returns 403", async () => {
    localStorage.setItem("token", "Bearer creator-token");
    api.post.mockRejectedValue({
      status: 403,
      message: "账号已停用，请联系管理员",
    });
    const store = useAdminSessionStore();

    await expect(store.login({ username: "disabled", password: "secret" })).rejects.toThrow(
      "账号已停用，请联系管理员",
    );
    expect(store.errorMessage).toBe("账号已停用，请联系管理员");
    expect(localStorage.getItem("token")).toBe("Bearer creator-token");
    expect(store.token).toBe("Bearer creator-token");
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

  it("ignores a stale successful restore after a newer login completes", async () => {
    localStorage.setItem("token", "Bearer old-token");
    const staleSession = deferred<unknown>();
    api.get
      .mockImplementationOnce(() => staleSession.promise)
      .mockResolvedValueOnce({ data: { code: 200, data: newerAdminSession, message: "成功" } });
    api.post.mockResolvedValue({
      data: {
        code: 200,
        data: { token: "Bearer new-token", id: 5, name: "新管理员", role: "super_admin" },
        message: "登录成功",
      },
    });
    const store = useAdminSessionStore();

    const staleRestore = store.restore();
    await store.login({ username: "new-admin", password: "secret" });
    staleSession.resolve({ data: { code: 200, data: adminSession, message: "成功" } });
    await Promise.allSettled([staleRestore]);

    expect(store.token).toBe("Bearer new-token");
    expect(store.session).toEqual(newerAdminSession);
    expect(store.restoring).toBe(false);
  });

  it("ignores a stale 401 after a newer restore succeeds with the same token", async () => {
    localStorage.setItem("token", "Bearer persisted-token");
    const staleSession = deferred<unknown>();
    api.get
      .mockImplementationOnce(() => staleSession.promise)
      .mockResolvedValueOnce({ data: { code: 200, data: newerAdminSession, message: "成功" } });
    const store = useAdminSessionStore();

    const staleRestore = store.restore();
    await expect(store.restore()).resolves.toBe("authenticated");
    const staleConfig = api.get.mock.calls[0]?.[1];
    await api.options?.onUnauthorized?.({ config: staleConfig });
    staleSession.reject({ status: 401, message: "无效的token" });
    await Promise.allSettled([staleRestore]);

    expect(store.token).toBe("Bearer persisted-token");
    expect(localStorage.getItem("token")).toBe("Bearer persisted-token");
    expect(store.session).toEqual(newerAdminSession);
  });
});
