
import type { Demo, AppSettings, PlayerAdvancedStats } from "../types/demo";

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

// ─────────────────────────────────────────
//  Advanced stats cache (parse_demo_advanced_stats)
// ─────────────────────────────────────────

const ADV_STATS_PREFIX = "cs2dm_adv_";

/** DJB2 hash of a filepath for a short, stable cache key. */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export function loadAdvancedStatsCache(
  filepath: string
): PlayerAdvancedStats[] | null {
  try {
    const raw = localStorage.getItem(ADV_STATS_PREFIX + djb2(filepath));
    if (!raw) return null;
    return JSON.parse(raw) as PlayerAdvancedStats[];
  } catch {
    return null;
  }
}

export function saveAdvancedStatsCache(
  filepath: string,
  stats: PlayerAdvancedStats[]
): void {
  localStorage.setItem(
    ADV_STATS_PREFIX + djb2(filepath),
    JSON.stringify(stats)
  );
}
