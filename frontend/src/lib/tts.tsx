import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_VOICE, isValidVoice } from "./naturalVoice";

export type TtsSettings = {
  rate: number; // playback speed 0.5 - 1.75
  voice: string; // natural (OpenAI) voice id
};

const DEFAULT: TtsSettings = { rate: 1.0, voice: DEFAULT_VOICE };
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
        if (raw) {
          const saved = JSON.parse(raw);
          setSettings({
            rate: typeof saved.rate === "number" ? saved.rate : DEFAULT.rate,
            // old device-voice ids are not valid anymore -> default natural voice
            voice: isValidVoice(saved.voice) ? saved.voice : DEFAULT.voice,
          });
        }
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
