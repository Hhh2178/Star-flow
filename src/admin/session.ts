import { defineStore } from "pinia";
import { ref } from "vue";
import { createApiClient, type ApiClientError } from "../shared/api";
import type { ApiResponse, AuthSession, LoginPayload } from "../shared/auth";
import { evaluateAdminSession } from "./session-policy";

export const ADMIN_TOKEN_STORAGE_KEY = "token";

export interface LoginCredentials {
  username: string;
  password: string;
}

export type RestoreResult = "authenticated" | "anonymous" | "forbidden";

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

export const useAdminSessionStore = defineStore("admin-session", () => {
  const token = ref<string | null>(readToken());
  const session = ref<AuthSession | null>(null);
  const loading = ref(false);
  const restoring = ref(false);
  const errorMessage = ref("");

  function resetSession() {
    token.value = null;
    session.value = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      localStorage.removeItem("userId");
    }
  }

  function clearSession() {
    resetSession();
    errorMessage.value = "";
  }

  function setToken(nextToken: string) {
    token.value = nextToken;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
    }
  }

  function denyAccess(): Error {
    resetSession();
    errorMessage.value = "当前账号无权进入管理后台";
    return new Error(errorMessage.value);
  }

  const api = createApiClient({
    getToken: () => token.value,
    onUnauthorized: resetSession,
  });

  async function fetchSession(): Promise<AuthSession> {
    const response = await api.get<ApiResponse<AuthSession>>("/admin/auth/session");
    const evaluation = evaluateAdminSession(response.data.data);
    if (!evaluation.allowed) throw denyAccess();

    session.value = evaluation.session;
    errorMessage.value = "";
    return evaluation.session;
  }

  async function login(credentials: LoginCredentials): Promise<AuthSession> {
    loading.value = true;
    errorMessage.value = "";
    try {
      let response;
      try {
        response = await api.post<ApiResponse<LoginPayload>>("/login/login", credentials);
      } catch (error) {
        resetSession();
        errorMessage.value = errorText(error, "登录失败，请检查账号和密码");
        throw new Error(errorMessage.value);
      }

      const nextToken = response.data.data?.token;
      if (!nextToken) throw new Error("登录响应缺少 Token");
      setToken(nextToken);

      try {
        return await fetchSession();
      } catch (error) {
        const status = errorStatus(error);
        if (status === 403 || errorMessage.value === "当前账号无权进入管理后台") {
          throw denyAccess();
        }
        if (status === 401) resetSession();
        errorMessage.value = errorText(error, "登录失败，请检查账号和密码");
        throw new Error(errorMessage.value);
      }
    } finally {
      loading.value = false;
    }
  }

  async function restore(): Promise<RestoreResult> {
    if (!token.value) {
      resetSession();
      return "anonymous";
    }

    restoring.value = true;
    try {
      await fetchSession();
      return "authenticated";
    } catch (error) {
      const status = errorStatus(error);
      if (status === 403 || errorMessage.value === "当前账号无权进入管理后台") {
        denyAccess();
        return "forbidden";
      }
      if (status === 401) {
        resetSession();
        return "anonymous";
      }
      errorMessage.value = errorText(error, "无法验证登录状态，请稍后重试");
      throw error;
    } finally {
      restoring.value = false;
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
