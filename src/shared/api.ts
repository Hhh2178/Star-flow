import axios, { type AxiosError, type AxiosInstance } from "axios";

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  getBaseURL?: () => string | undefined;
  getTimeout?: () => number | undefined;
  getToken?: () => string | null;
  unwrapResponse?: boolean;
  onUnauthorized?: (error: AxiosError) => void | Promise<void>;
  onError?: (error: AxiosError) => void | Promise<void>;
}

export interface ApiClientError {
  status?: number;
  code?: number;
  message: string;
  data?: unknown;
}

function getStoredToken(): string | null {
  return typeof localStorage === "undefined" ? null : localStorage.getItem("token");
}

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL ?? "/api",
    timeout: options.timeout,
  });

  client.interceptors.request.use((config) => {
    config.baseURL = options.getBaseURL?.() ?? options.baseURL ?? "/api";
    const timeout = options.getTimeout?.() ?? options.timeout;
    if (timeout !== undefined) config.timeout = timeout;

    const token = (options.getToken ?? getStoredToken)();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => options.unwrapResponse ? response.data : response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await options.onUnauthorized?.(error);
      }
      await options.onError?.(error);
      const responseData = error.response?.data;
      if (responseData && typeof responseData === "object") {
        return Promise.reject({
          ...responseData,
          status: error.response?.status,
        });
      }
      return Promise.reject({
        status: error.response?.status,
        message: error.message || "请求失败",
        data: responseData,
      } satisfies ApiClientError);
    },
  );

  return client;
}
