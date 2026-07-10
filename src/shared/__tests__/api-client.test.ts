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

  it("calls the supplied callback when the server returns 401", async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({ onUnauthorized });
    client.defaults.adapter = async (config) => {
      const unauthorized = response(config, 401);
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, unauthorized);
    };

    await expect(client.get("/admin/auth/session")).rejects.toMatchObject({
      status: 401,
      message: "登录已失效",
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
