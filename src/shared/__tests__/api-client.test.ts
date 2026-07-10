import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../api";

function response(config: InternalAxiosRequestConfig, status = 200): AxiosResponse {
  return {
    config,
    data: { code: status, data: null, message: status === 200 ? "成功" : "登录已失效" },
    headers: {},
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
  };
}

describe("createApiClient", () => {
  it("uses the /api base URL and injects the current token", async () => {
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const client = createApiClient({
      getToken: () => "Bearer admin-token",
    });
    client.defaults.adapter = async (config) => {
      requestConfig = config;
      return response(config);
    };

    await client.get("/admin/auth/session");

    expect(requestConfig?.baseURL).toBe("/api");
    expect(requestConfig?.headers.Authorization).toBe("Bearer admin-token");
  });

  it("preserves an explicit request Authorization header", async () => {
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const client = createApiClient({ getToken: () => "Bearer current-token" });
    client.defaults.adapter = async (config) => {
      requestConfig = config;
      return response(config);
    };

    await client.get("/admin/auth/session", {
      headers: { Authorization: "Bearer request-token" },
    });

    expect(requestConfig?.headers.Authorization).toBe("Bearer request-token");
  });

  it("calls the supplied callback when the server returns 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({ onUnauthorized });
    client.defaults.adapter = async (config) => {
      const unauthorized = response(config, 401);
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, unauthorized);
    };

    await expect(client.get("/admin/auth/session", {
      headers: { Authorization: "Bearer request-token" },
    })).rejects.toMatchObject({
      status: 401,
      message: "登录已失效",
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized.mock.calls[0]?.[0]).toBeInstanceOf(AxiosError);
    expect(onUnauthorized.mock.calls[0]?.[0].config?.headers.Authorization).toBe(
      "Bearer request-token",
    );
  });

  it("can skip unauthorized handling for a public login request", async () => {
    const onUnauthorized = vi.fn();
    const shouldHandleUnauthorized = vi.fn((error: AxiosError) => (
      error.config?.url !== "/login/login"
    ));
    const client = createApiClient({ onUnauthorized, shouldHandleUnauthorized });
    client.defaults.adapter = async (config) => {
      const unauthorized = response(config, 401);
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, unauthorized);
    };

    await expect(client.post("/login/login")).rejects.toMatchObject({ status: 401 });

    expect(shouldHandleUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("reads the base URL and timeout for every request", async () => {
    let baseURL = "http://localhost:10588/api";
    let timeout = 600_000;
    const requests: Array<{ baseURL?: string; timeout?: number }> = [];
    const client = createApiClient({
      getBaseURL: () => baseURL,
      getTimeout: () => timeout,
    });
    client.defaults.adapter = async (config) => {
      requests.push({ baseURL: config.baseURL, timeout: config.timeout });
      return response(config);
    };

    await client.get("/first");
    baseURL = "http://127.0.0.1:20588/api";
    timeout = 30_000;
    await client.get("/second");

    expect(requests).toEqual([
      { baseURL: "http://localhost:10588/api", timeout: 600_000 },
      { baseURL: "http://127.0.0.1:20588/api", timeout: 30_000 },
    ]);
  });

  it("can unwrap successful response data for Creator compatibility", async () => {
    const client = createApiClient({ unwrapResponse: true });
    client.defaults.adapter = async (config) => ({
      ...response(config),
      data: { code: 200, data: { id: 7 }, message: "成功" },
    });

    await expect(client.get("/setting/loginConfig/me")).resolves.toEqual({
      code: 200,
      data: { id: 7 },
      message: "成功",
    });
  });

  it("calls onError for network failures", async () => {
    const onError = vi.fn();
    const client = createApiClient({ onError });
    client.defaults.adapter = async (config) => {
      throw new AxiosError("Network Error", "ERR_NETWORK", config);
    };

    await expect(client.get("/offline")).rejects.toMatchObject({
      message: "Network Error",
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
