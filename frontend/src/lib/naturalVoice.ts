import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;

export const DEFAULT_VOICE = "coral";

export const NATURAL_VOICES = [
  { id: "coral", label: "Coral", desc: "Calda e amichevole" },
  { id: "sage", label: "Sage", desc: "Pacata e riflessiva" },
  { id: "fable", label: "Fable", desc: "Espressiva, da racconto" },
  { id: "onyx", label: "Onyx", desc: "Profonda e autorevole" },
  { id: "ballad", label: "Ballad", desc: "Morbida e melodiosa" },
  { id: "verse", label: "Verse", desc: "Narrativa e versatile" },
  { id: "nova", label: "Nova", desc: "Energica e vivace" },
  { id: "shimmer", label: "Shimmer", desc: "Luminosa e allegra" },
  { id: "echo", label: "Echo", desc: "Morbida e calma" },
  { id: "alloy", label: "Alloy", desc: "Neutra ed equilibrata" },
  { id: "ash", label: "Ash", desc: "Chiara e scandita" },
];

export const isValidVoice = (v: unknown): v is string =>
  typeof v === "string" && NATURAL_VOICES.some((n) => n.id === v);

export const voiceLabel = (id: string) => NATURAL_VOICES.find((v) => v.id === id)?.label || id;

// One shared player for the whole app, so only one audio plays at a time.
let player: AudioPlayer | null = null;
let modeReady = false;

export function getPlayer(): AudioPlayer {
  if (!player) player = createAudioPlayer(null);
  return player;
}

export async function ensureAudioMode() {
  if (modeReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  } catch (e) {
    console.warn("[voice] audio mode failed", e);
  }
  modeReady = true;
}

export function playNaturalUrl(url: string, rate: number) {
  const p = getPlayer();
  p.replace({ uri: `${BASE}${url}` });
  try {
    p.setPlaybackRate(rate);
  } catch (e) {
    console.warn("[voice] playback rate failed", e);
  }
  p.play();
}

export function stopNatural() {
  if (!player) return;
  try {
    player.pause();
  } catch (e) {
    console.warn("[voice] stop failed", e);
  }
}
