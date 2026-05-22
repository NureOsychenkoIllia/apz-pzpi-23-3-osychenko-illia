import { API_BASE_URL } from "@/config/appConfig";
import { sessionStorageApi } from "@/lib/storage";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const notifyUnauthorized = () => {
  window.dispatchEvent(new CustomEvent("bo:unauthorized"));
};

export async function http<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = sessionStorageApi.getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    sessionStorageApi.removeToken();
    sessionStorageApi.removeUser();
    notifyUnauthorized();
    throw new ApiError("Unauthorized", 401);
  }

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new ApiError((data as { error?: string }).error ?? "Request failed", response.status);
  }

  return data;
}
