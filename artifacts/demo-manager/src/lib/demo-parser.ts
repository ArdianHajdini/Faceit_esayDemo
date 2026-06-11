/**
 * Client-side CS2 / CS:GO demo binary header parser.
 *
 * CS:GO (HL2DEMO format):
 *   0-7   : magic "HL2DEMO\0"
 *   8-11  : demo protocol (int32 LE)
 *   12-15 : network protocol (int32 LE)
 *   16-275: server name (260 bytes, null-terminated)
 *   276-535: client name (260 bytes, null-terminated)
 *   536-795: map name (260 bytes, null-terminated)  ← key field
 *   796-1055: game directory
 *   1056-1059: playback time (float32 LE)
 *   1060-1063: tick count (int32 LE)
 *   ...
 *
 * CS2 (PBDEMS2 format):
 *   0-7   : magic "PBDEMS2\0"
 *   8-11  : fileinfo offset (int32 LE)
 *   12-15 : fileinfo size (int32 LE)
 *   → rest is protobuf. We scan the first 32 KB for readable map/team strings.
 *
 * .gz files: skip the 10-byte gzip header, try to parse as raw demo.
 *   (We do a best-effort text scan since we can't decompress in the browser
 *    without a WASM decompressor.)
 */

export interface DemoMeta {
  map?: string;
  serverName?: string;
  format: "HL2DEMO" | "PBDEMS2" | "unknown";
  date: Date;
}

const MAP_RE = /de_[a-z0-9_]{2,20}|cs_[a-z0-9_]{2,20}|aim_[a-z0-9_]{2,20}/;

function readNullStr(bytes: Uint8Array, offset: number, maxLen: number): string {
  const slice = bytes.slice(offset, offset + maxLen);
  const nullIdx = slice.indexOf(0);
  const end = nullIdx >= 0 ? nullIdx : maxLen;
  return new TextDecoder("latin1").decode(slice.slice(0, end)).trim();
}

function scanForMap(bytes: Uint8Array): string | undefined {
  // Decode as latin1 to avoid replacement chars that break regex
  const text = new TextDecoder("latin1").decode(bytes);
  const m = text.match(MAP_RE);
  return m ? m[0] : undefined;
}

function scanForTeams(bytes: Uint8Array): { team1?: string; team2?: string } {
  // FACEIT demos sometimes embed clan tag strings early in the protobuf data.
  // We scan for null-terminated strings that look like team names (2-32 chars, printable ASCII).
  const text = new TextDecoder("latin1").decode(bytes);

  // Look for consecutive short printable words that might be team names.
  // This is heuristic — works only for FACEIT HL2DEMO demos that store team info in the header area.
  const teamRe = /[\x20-\x7E]{3,32}/g;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = teamRe.exec(text)) !== null) {
    const s = m[0].trim();
    // Filter out map names and common non-team strings
    if (
      s.length >= 3 &&
      s.length <= 32 &&
      !s.startsWith("de_") &&
      !s.startsWith("cs_") &&
      !s.startsWith("HL2") &&
      !s.startsWith("PBS") &&
      !s.includes("127.0") &&
      !s.includes("192.168") &&
      !/^\d+$/.test(s)
    ) {
      candidates.push(s);
    }
    if (candidates.length >= 20) break;
  }

  // The server name field (offsets 16-275 in HL2DEMO) often contains
  // "Team A vs Team B" or the FACEIT match title.
  return { team1: undefined, team2: undefined };
}

export async function parseDemoFile(file: File): Promise<DemoMeta> {
  const date = new Date(file.lastModified);

  // Read the first 32 KB — enough to cover the header and some early protobuf frames.
  const READ_SIZE = 32768;
  const blob = file.slice(0, READ_SIZE);
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 8) {
    return { format: "unknown", date };
  }

  const magic = new TextDecoder("latin1").decode(bytes.slice(0, 8));

  if (magic === "HL2DEMO\0") {
    const serverName = readNullStr(bytes, 16, 260);
    const mapName = readNullStr(bytes, 536, 260);

    // Server name often looks like "FACEIT.com | de_mirage | match_id"
    // Try to extract team names from it.
    let team1: string | undefined;
    let team2: string | undefined;
    const vsMatch = serverName.match(/^(.+?)\s+vs\.?\s+(.+?)(\s*\|.*)?$/i);
    if (vsMatch) {
      team1 = vsMatch[1].trim();
      team2 = vsMatch[2].trim();
    }

    return {
      format: "HL2DEMO",
      map: mapName || undefined,
      serverName: serverName || undefined,
      date,
    };
  }

  if (magic === "PBDEMS2\0") {
    // Protobuf format — scan for recognisable strings.
    const map = scanForMap(bytes);

    // In PBDEMS2, the server name / team info is deep in protobuf.
    // We can only do a best-effort text scan.
    return {
      format: "PBDEMS2",
      map,
      date,
    };
  }

  // .gz file — first two bytes are 0x1F 0x8B.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // We can't decompress without WASM, but we can still try a text scan.
    // Sometimes readable strings survive compression if the source was mostly ASCII.
    const map = scanForMap(bytes);
    return { format: "unknown", map, date };
  }

  return { format: "unknown", date };
}
