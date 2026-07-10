import { defineStore } from "pinia";
import { ref } from "vue";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { createApiClient, type ApiClientError } from "../shared/api";
import type { ApiResponse, AuthSession, LoginPayload } from "../shared/auth";
import { evaluateAdminSession } from "./session-policy";

export const ADMIN_TOKEN_STORAGE_KEY = "token";

export interface LoginCredentials {
  username: string;
  password: string;
}

export type RestoreResult = "authenticated" | "anonymous" | "forbidden";

interface AdminSessionRequestConfig extends AxiosRequestConfig {
  adminSessionGeneration: number;
}

class SessionOperationSupersededError extends Error {
  constructor() {
    super("登录状态请求已被更新操作取代");
  }
}

function readToken(): string | null {
  return typeof localStorage === "undefined" ? null : localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

function errorStatus(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error
    ? Number((error as ApiClientError).status)
    : undefined;
}

function errorText(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

function requestAuthorization(error: AxiosError): string | null {
  const headers = error.config?.headers;
  if (!headers) return null;
  const value = typeof headers.get === "function"
    ? headers.get("Authorization")
    : headers.Authorization;
  return typeof value === "string" ? value : null;
}

function requestGeneration(error: AxiosError): number | undefined {
  return (error.config as AdminSessionRequestConfig | undefined)?.adminSessionGeneration;
}

export const useAdminSessionStore = defineStore("admin-session", () => {
  const token = ref<string | null>(readToken());
  const session = ref<AuthSession | null>(null);
  const loading = ref(false);
  const restoring = ref(false);
  const errorMessage = ref("");
  let operationGeneration = 0;

  function clearStoredTokenAndAdminSession() {
    token.value = null;
    session.value = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      localStorage.removeItem("userId");
    }
  }

  function clearSession() {
    operationGeneration += 1;
    clearStoredTokenAndAdminSession();
    loading.value = false;
    restoring.value = false;
    errorMessage.value = "";
  }

  function setToken(nextToken: string) {
    token.value = nextToken;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
    }
  }

  function isCurrentOperation(generation: number, requestToken: string | null): boolean {
    return generation === operationGeneration && token.value === requestToken;
  }

  function assertCurrentOperation(generation: number, requestToken: string | null) {
    if (!isCurrentOperation(generation, requestToken)) {
      throw new SessionOperationSupersededError();
    }
  }

  function operationConfig(
    generation: number,
    requestToken: string | null,
  ): AdminSessionRequestConfig {
    return {
      adminSessionGeneration: generation,
      headers: requestToken ? { Authorization: requestToken } : {},
    };
  }

  function clearUnauthorizedOperation(generation: number, requestToken: string | null): boolean {
    if (!isCurrentOperation(generation, requestToken)) return false;
    clearStoredTokenAndAdminSession();
    return true;
  }

  function denyAccess(generation: number, requestToken: string): Error {
    assertCurrentOperation(generation, requestToken);
    session.value = null;
    errorMessage.value = "当前账号无权进入管理后台";
    return new Error(errorMessage.value);
  }

  const api = createApiClient({
    getToken: () => token.value,
    onUnauthorized: (error) => {
      const generation = requestGeneration(error);
      const requestToken = requestAuthorization(error);
      if (generation !== undefined && requestToken !== null) {
        clearUnauthorizedOperation(generation, requestToken);
      }
    },
  });

  async function fetchSessionForOperation(
    generation: number,
    requestToken: string,
  ): Promise<AuthSession> {
    const response = await api.get<ApiResponse<AuthSession>>(
      "/admin/auth/session",
      operationConfig(generation, requestToken),
    );
    assertCurrentOperation(generation, requestToken);
    const evaluation = evaluateAdminSession(response.data.data);
    if (!evaluation.allowed) throw denyAccess(generation, requestToken);

    session.value = evaluation.session;
    errorMessage.value = "";
    return evaluation.session;
  }

  async function fetchSession(): Promise<AuthSession> {
    const generation = ++operationGeneration;
    const requestToken = token.value;
    if (!requestToken) throw new Error("当前没有可验证的登录状态");
    return fetchSessionForOperation(generation, requestToken);
  }

  async function login(credentials: LoginCredentials): Promise<AuthSession> {
    const generation = ++operationGeneration;
    let requestToken = token.value;
    let sessionRequestStarted = false;
    restoring.value = false;
    loading.value = true;
    errorMessage.value = "";
    try {
      const response = await api.post<ApiResponse<LoginPayload>>(
        "/login/login",
        credentials,
        operationConfig(generation, requestToken),
      );
      assertCurrentOperation(generation, requestToken);

      const nextToken = response.data.data?.token;
      if (!nextToken) throw new Error("登录响应缺少 Token");
      setToken(nextToken);
      requestToken = nextToken;
      sessionRequestStarted = true;

      return await fetchSessionForOperation(generation, requestToken);
    } catch (error) {
      if (error instanceof SessionOperationSupersededError || generation !== operationGeneration) {
        throw new SessionOperationSupersededError();
      }

      const status = errorStatus(error);
      if (status === 403 && sessionRequestStarted && requestToken) {
        throw denyAccess(generation, requestToken);
      }
      if (status === 401) {
        clearUnauthorizedOperation(generation, requestToken);
      }
      if (generation === operationGeneration) {
        errorMessage.value = errorText(error, "登录失败，请检查账号和密码");
      }
      throw new Error(errorMessage.value || "登录失败，请检查账号和密码");
    } finally {
      if (generation === operationGeneration) loading.value = false;
    }
  }

  async function restore(): Promise<RestoreResult> {
    const generation = ++operationGeneration;
    const requestToken = token.value;
    loading.value = false;
    if (!requestToken) {
      session.value = null;
      restoring.value = false;
      errorMessage.value = "";
      return "anonymous";
    }

    restoring.value = true;
    try {
      await fetchSessionForOperation(generation, requestToken);
      return "authenticated";
    } catch (error) {
      if (error instanceof SessionOperationSupersededError || generation !== operationGeneration) {
        throw new SessionOperationSupersededError();
      }

      const status = errorStatus(error);
      if (status === 403 || errorMessage.value === "当前账号无权进入管理后台") {
        denyAccess(generation, requestToken);
        return "forbidden";
      }
      if (status === 401) {
        clearUnauthorizedOperation(generation, requestToken);
        return "anonymous";
      }
      errorMessage.value = errorText(error, "无法验证登录状态，请稍后重试");
      throw error;
    } finally {
      if (generation === operationGeneration) restoring.value = false;
    }
  }

  function logout() {
    clearSession();
  }

  return {
    token,
    session,
    loading,
    restoring,
    errorMessage,
    login,
    fetchSession,
    restore,
    logout,
    clearSession,
  };
});
