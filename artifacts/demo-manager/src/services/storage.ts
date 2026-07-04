
import type { Demo, AppSettings } from "../types/demo";

const DEMOS_KEY = "cs2dm_demos";
const SETTINGS_KEY = "cs2dm_settings";
const MAP_CACHE_KEY = "cs2dm_map_cache";
const META_CACHE_KEY = "cs2dm_meta_cache";

export const DEFAULT_SETTINGS: AppSettings = {
  // Empty by default — the app auto-detects the CS2 replay folder on first launch.
  // Once detected: <Steam>/steamapps/common/Counter-Strike Global Offensive/game/csgo/replays
  demoDirectory: "",
  cs2Path: "",
  steamPath: "",
  autoExtractGz: true,
  autoAddToLibrary: true,
  // Downloads-Ordner: auto-detected from Windows USERPROFILE if left empty.
  // User can override in settings.
  downloadsFolder: "",
  // Steam ID64 of the local player — filled automatically when connecting via FACEIT.
  steamId: "",
  // UI language — English by default.
  language: "en",
};

export function loadDemos(): Demo[] {
  try {
    const raw = localStorage.getItem(DEMOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Demo[];
  } catch {
    return [];
  }
}

export function saveDemos(demos: Demo[]): void {
  localStorage.setItem(DEMOS_KEY, JSON.stringify(demos));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** filepath → map name cache, survives page reloads without re-parsing. */
export function loadMapCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAP_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveMapCache(cache: Record<string, string>): void {
  localStorage.setItem(MAP_CACHE_KEY, JSON.stringify(cache));
}

/** filepath → { map, scoreT, scoreCT } meta cache, survives reloads without re-parsing. */
export interface MetaCacheEntry {
  map?: string;
  scoreT?: number;
  scoreCT?: number;
}

export function loadMetaCache(): Record<string, MetaCacheEntry> {
  try {
    const raw = localStorage.getItem(META_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MetaCacheEntry>;
  } catch {
    return {};
  }
}

export function saveMetaCache(cache: Record<string, MetaCacheEntry>): void {
  localStorage.setItem(META_CACHE_KEY, JSON.stringify(cache));
}
