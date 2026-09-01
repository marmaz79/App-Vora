import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TtsSettings = {
  rate: number; // 0.5 - 1.5
  pitch: number; // 0.5 - 1.5
  voice: string | null;
};

const DEFAULT: TtsSettings = { rate: 1.0, pitch: 1.0, voice: null };
const KEY = "leggimi_tts_settings";

type Ctx = {
  settings: TtsSettings;
  update: (patch: Partial<TtsSettings>) => Promise<void>;
};
const C = createContext<Ctx | undefined>(undefined);

export function TtsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TtsSettings>(DEFAULT);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
      } catch {}
    })();
  }, []);

  const update = async (patch: Partial<TtsSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const value = useMemo(() => ({ settings, update }), [settings]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useTts() {
  const c = useContext(C);
  if (!c) throw new Error("useTts must be inside TtsProvider");
  return c;
}
