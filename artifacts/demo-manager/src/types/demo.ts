
export interface Demo {
  id: string;
  filename: string;
  displayName: string;
  filepath: string;
  size: number;
  modifiedAt: string;
  directory: string;
  /**
   * Optional, user-provided display metadata (FACEIT-style). Not present in the
   * demo file itself — entered on import and persisted in localStorage. Preserved
   * across disk refreshes by matching on filepath.
   */
  map?: string;
  team1Name?: string;
  team2Name?: string;
  scoreT?: number;
  scoreCT?: number;
}

export interface AppSettings {
  demoDirectory: string;
  cs2Path: string;
  steamPath: string;
  autoExtractGz: boolean;
  autoAddToLibrary: boolean;
  /** Folder to scan for downloaded demo files (.dem, .dem.gz, .dem.zst) */
  downloadsFolder: string;
  /**
   * Steam ID64 of the local player (e.g. "76561198012345678").
   * Filled automatically when connecting via FACEIT (game_player_id).
   * Used by the demo parser to identify the user's own team.
   */
  steamId: string;
  /** UI language code, e.g. "en", "de". Defaults to "en". */
  language: string;
}

/** Per-player advanced stats returned by parse_demo_advanced_stats. */
export interface PlayerAdvancedStats {
  xuid: string;
  name: string;
  teamNum: number;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  /** Total first-burst shots counted for counter-strafe analysis. */
  csShotsTotal: number;
  /** Shots where horizontal speed < 30 u/s (well counter-strafed). */
  csShotsClean: number;
  /** Simplified HLTV-style rating (0.0–2.0+). */
  rating: number;
}

export type CS2Status = "found" | "not_found" | "unknown";

export type StatusMessage =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | { type: "info"; message: string }
  | null;
