import axios, { type AxiosError, type AxiosInstance } from "axios";

export interface ApiClientOptions {
  baseURL?: string;
  getToken?: () => string | null;
  onUnauthorized?: (error: AxiosError) => void | Promise<void>;
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
  });

  client.interceptors.request.use((config) => {
    const token = (options.getToken ?? getStoredToken)();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await options.onUnauthorized?.(error);
      }
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
