import { useCallback, useEffect, useState } from "react";

import { defaultTweaks } from "@/config/appConfig";
import { tweakStorage } from "@/lib/storage";
import type { AppTweakState } from "@/types/domain";

export function useTweakState() {
  const [state, setState] = useState<AppTweakState>(() => ({
    ...defaultTweaks,
    ...tweakStorage.get(),
  }));

  useEffect(() => {
    tweakStorage.set(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", state.accent);
    document.documentElement.setAttribute("data-density", state.density);
  }, [state]);

  const setTweak = useCallback(<K extends keyof AppTweakState>(key: K, value: AppTweakState[K]) => {
    setState((current) => (current[key] === value ? current : { ...current, [key]: value }));
  }, []);

  return { tweaks: state, setTweak };
}
