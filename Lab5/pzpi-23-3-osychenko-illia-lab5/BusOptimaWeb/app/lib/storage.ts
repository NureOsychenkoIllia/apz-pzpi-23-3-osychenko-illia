import type { AppTweakState, SessionUser } from "@/types/domain";

const SESSION_TOKEN_KEY = "bo_token";
const SESSION_USER_KEY = "bo_user";
const TWEAKS_KEY = "busoptima:tweaks";

export const sessionStorageApi = {
  getToken: () => localStorage.getItem(SESSION_TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(SESSION_TOKEN_KEY),
  getUser: (): SessionUser | null => {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },
  setUser: (user: SessionUser) =>
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(SESSION_USER_KEY),
};

export const tweakStorage = {
  get: (): Partial<AppTweakState> => {
    const raw = localStorage.getItem(TWEAKS_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppTweakState>) : {};
  },
  set: (value: AppTweakState) =>
    localStorage.setItem(TWEAKS_KEY, JSON.stringify(value)),
};
