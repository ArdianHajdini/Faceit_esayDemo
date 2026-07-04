import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  Map as MapIcon,
  Calendar,
  HardDrive,
  Activity,
  Mic,
  Copy,
  CheckCircle2,
  Users,
  Loader2,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadDemos, loadSettings, loadMapCache, loadAdvancedStatsCache, saveAdvancedStatsCache } from "@/services/storage";
import { formatFileSize } from "@/services/demoService";
import {
  isTauri,
  tauriParseDemoPlayers,
  tauriParseAdvancedStats,
  type TauriDemoPlayer,
} from "@/services/tauriBridge";
import {
  getCachedPlayers,
  setCachedPlayers,
} from "@/services/parsedPlayersCache";
import {
  VOICE_OPTIONS,
  buildRosters,
  getPlayersToHear,
  buildFullPlayCommand,
} from "@/services/voiceService";
import { useTranslation } from "@/services/i18n";
import type { PlayerAdvancedStats } from "@/types/demo";

async function loadPlayers(filepath: string): Promise<TauriDemoPlayer[]> {
  if (!isTauri()) return [];
  const cached = getCachedPlayers(filepath);
  if (cached) return cached;
  const players = await tauriParseDemoPlayers(filepath);
  setCachedPlayers(filepath, players);
  return players;
}

async function loadAdvancedStats(filepath: string): Promise<PlayerAdvancedStats[]> {
  if (!isTauri()) return [];
  const cached = loadAdvancedStatsCache(filepath);
  if (cached) return cached;
  const stats = await tauriParseAdvancedStats(filepath);
  saveAdvancedStatsCache(filepath, stats);
  return stats;
}

function PlayerRow({ p }: { p: TauriDemoPlayer }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 hover:bg-secondary/50 rounded transition-colors group">
      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
        {p.name}
        {p.isHltv && (
          <Badge variant="outline" className="ml-2 text-[9px] uppercase">HLTV</Badge>
        )}
      </span>
      <div className="flex space-x-3 text-xs font-mono text-muted-foreground">
        <span title="Steam ID64">{p.xuid || "—"}</span>
        <span title="Voice slot" className="w-8 text-right">
          {p.entityId !== undefined ? `#${p.entityId}` : "—"}
        </span>
      </div>
    </div>
  );
}

function ratingColor(r: number): string {
  if (r >= 1.15) return "text-green-400";
  if (r >= 1.00) return "text-yellow-400";
  if (r >= 0.85) return "text-orange-400";
  return "text-red-400";
}

function csPercent(total: number, clean: number): string {
  if (total === 0) return "—";
  return `${Math.round((clean / total) * 100)}%`;
}

function csColor(total: number, clean: number): string {
  if (total === 0) return "text-muted-foreground";
  const pct = clean / total;
  if (pct >= 0.75) return "text-green-400";
  if (pct >= 0.55) return "text-yellow-400";
  return "text-orange-400";
}

function AdvancedStatsTable({
  stats,
  team1Name,
  team2Name,
}: {
  stats: PlayerAdvancedStats[];
  team1Name?: string;
  team2Name?: string;
}) {
  const ts = stats.filter((p) => p.teamNum === 2);
  const cts = stats.filter((p) => p.teamNum === 3);

  const TeamTable = ({
    players,
    label,
  }: {
    players: PlayerAdvancedStats[];
    label: string;
  }) => (
    <div>
      <h3 className="font-bold text-sm mb-3 uppercase tracking-wide text-foreground border-b border-border pb-2">
        {label}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-1 px-2 font-medium">Player</th>
              <th className="text-center py-1 px-2 font-medium w-8">K</th>
              <th className="text-center py-1 px-2 font-medium w-8">D</th>
              <th className="text-center py-1 px-2 font-medium w-8">A</th>
              <th className="text-center py-1 px-2 font-medium w-10">★</th>
              <th className="text-center py-1 px-2 font-medium w-16">Rating</th>
              <th className="text-center py-1 px-2 font-medium w-20" title="Counter-strafe accuracy (first-burst shots where speed < 30 u/s)">CS%</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.xuid || p.name}
                className="hover:bg-secondary/40 transition-colors border-b border-border/40 last:border-0"
              >
                <td className="py-2 px-2 font-medium text-foreground truncate max-w-[140px]">
                  {p.name}
                </td>
                <td className="py-2 px-2 text-center font-mono text-green-400">{p.kills}</td>
                <td className="py-2 px-2 text-center font-mono text-red-400">{p.deaths}</td>
                <td className="py-2 px-2 text-center font-mono text-muted-foreground">{p.assists}</td>
                <td className="py-2 px-2 text-center font-mono text-yellow-400">{p.mvps}</td>
                <td className={`py-2 px-2 text-center font-mono font-bold ${ratingColor(p.rating)}`}>
                  {p.rating.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-center font-mono ${csColor(p.csShotsTotal, p.csShotsClean)}`}
                    title={`${p.csShotsClean}/${p.csShotsTotal} shots`}>
                  {csPercent(p.csShotsTotal, p.csShotsClean)}
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted-foreground italic text-xs">
                  No players
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <TeamTable players={ts} label={team1Name || "Terrorists"} />
      <TeamTable players={cts} label={team2Name || "Counter-Terrorists"} />
    </div>
  );
}

export default function DemoDetail() {
  const params = useParams();
  const id = params.id ?? "";
  const { toast } = useToast();
  const t = useTranslation();

  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsRequested, setStatsRequested] = useState(false);

  const demo = useMemo(() => loadDemos().find((d) => d.id === id) ?? null, [id]);
  const settings = useMemo(() => loadSettings(), []);

  const playdemoArg = useMemo(
    () => demo ? `replays/${demo.filename.replace(/\.dem$/i, "")}` : "",
    [demo],
  );

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["players", demo?.filepath],
    queryFn: () => loadPlayers(demo!.filepath),
    enabled: !!demo,
  });

  const { data: advStats, isLoading: loadingStats } = useQuery({
    queryKey: ["advStats", demo?.filepath],
    queryFn: () => loadAdvancedStats(demo!.filepath),
    enabled: !!demo && statsRequested,
  });

  const rosters = players ? buildRosters(players) : null;
  const presets = VOICE_OPTIONS.map((opt) => {
    const toHear = getPlayersToHear(opt.mode, rosters);
    const vo = t.voiceOptions[opt.mode as keyof typeof t.voiceOptions];
    return {
      mode: opt.mode,
      label: vo.label,
      description: vo.description,
      command: buildFullPlayCommand(playdemoArg, opt.mode, toHear),
    };
  });

  const handleCopy = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedPreset(label);
    toast({
      title: t.copiedTitle,
      description: t.copiedDesc(label),
    });
    setTimeout(() => setCopiedPreset(null), 2000);
  };

  const handleAnalyze = () => {
    setStatsRequested(true);
    setShowStats(true);
  };

  if (!demo) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Demo not found</h2>
        <p className="text-muted-foreground mt-2">The requested demo does not exist or was deleted.</p>
        <Link href="/">
          <Button className="mt-6">{t.backToLibrary}</Button>
        </Link>
      </div>
    );
  }

  const hasTeams = !!(demo.team1Name || demo.team2Name);
  const terrorists = rosters?.terrorists ?? [];
  const counterTerrorists = rosters?.counterTerrorists ?? [];
  const others = (players ?? []).filter((p) => p.teamNum !== 2 && p.teamNum !== 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Link href="/">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground pl-0 group">
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
          {t.backToLibrary}
        </Button>
      </Link>

      {/* Header Card */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 blur-3xl -z-10 rounded-full translate-x-1/2"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] tracking-wider">{t.ready}</Badge>
              <span className="text-sm font-mono text-muted-foreground break-all">{demo.filename}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground uppercase">
              {hasTeams ? (
                <>
                  {demo.team1Name || "Team A"}
                  <span className="text-muted-foreground opacity-50 px-2">VS</span>
                  {demo.team2Name || "Team B"}
                </>
              ) : (
                demo.displayName
              )}
            </h1>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground font-medium uppercase tracking-wider">
            <div className="flex items-center">
              <MapIcon className="w-4 h-4 mr-2 text-primary" />
              {demo.map ?? loadMapCache()[demo.filepath] ?? "—"}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              {format(new Date(demo.modifiedAt), "MMM d, yyyy")}
            </div>
            <div className="flex items-center">
              <HardDrive className="w-4 h-4 mr-2 text-primary" />
              {formatFileSize(demo.size)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Players + Advanced Stats */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4 bg-secondary/20">
              <CardTitle className="uppercase tracking-wider text-sm flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                {t.matchRoster}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.matchRosterDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPlayers ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm">{t.loadingPlayers}</span>
                </div>
              ) : !isTauri() ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t.playerParsingDesktopOnly}</p>
                  <p className="text-xs mt-1">{t.openDemoInApp}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                    {/* Terrorists */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                        {demo.team1Name || t.terrorists}
                      </h3>
                      <div className="space-y-1">
                        {terrorists.map((p) => (
                          <PlayerRow key={`${p.xuid}-${p.entityId}`} p={p} />
                        ))}
                        {terrorists.length === 0 && (
                          <div className="text-muted-foreground text-sm py-4 italic">{t.noPlayersDetected}</div>
                        )}
                      </div>
                    </div>

                    {/* Counter-Terrorists */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                        {demo.team2Name || t.counterTerrorists}
                      </h3>
                      <div className="space-y-1">
                        {counterTerrorists.map((p) => (
                          <PlayerRow key={`${p.xuid}-${p.entityId}`} p={p} />
                        ))}
                        {counterTerrorists.length === 0 && (
                          <div className="text-muted-foreground text-sm py-4 italic">{t.noPlayersDetected}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {others.length > 0 && (
                    <div className="p-4 border-t border-border bg-secondary/10">
                      <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">{t.spectatorsUnassigned}</h3>
                      <div className="flex flex-wrap gap-2">
                        {others.map((p) => (
                          <Badge key={`${p.xuid}-${p.entityId}`} variant="outline" className="font-mono text-xs">{p.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Advanced Stats Card */}
          {isTauri() && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-4 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="uppercase tracking-wider text-sm flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2 text-primary" />
                      Advanced Stats
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      K/D/A · Rating · Counter-strafe% — parsed from demo entities
                    </CardDescription>
                  </div>
                  {!showStats && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAnalyze}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                      Analyze
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {!showStats ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Click "Analyze" to parse K/D/A, Rating and Counter-strafe from the demo file.</p>
                    <p className="text-xs mt-1 opacity-70">Takes a few seconds — result is cached locally.</p>
                  </div>
                ) : loadingStats ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm">Parsing demo… this may take a few seconds</span>
                  </div>
                ) : advStats && advStats.length > 0 ? (
                  <AdvancedStatsTable
                    stats={advStats}
                    team1Name={demo.team1Name}
                    team2Name={demo.team2Name}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No player data found in this demo.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Voice Presets */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border pb-4 bg-primary/10">
              <CardTitle className="uppercase tracking-wider text-sm flex items-center text-primary font-bold">
                <Mic className="w-4 h-4 mr-2" />
                {t.voicePresets}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.voicePresetsDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {presets.map((preset) => {
                const available = preset.command !== null;
                const isCopied = copiedPreset === preset.label;
                return (
                  <div key={preset.label} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right max-w-[55%]">{preset.description}</span>
                    </div>
                    <div className="relative">
                      <div className="bg-background border border-border rounded p-3 pr-12 font-mono text-xs text-muted-foreground break-all overflow-hidden max-h-24 hover:text-foreground transition-colors cursor-text selection:bg-primary/30">
                        {available ? preset.command : t.presetNotAvailable}
                      </div>

                      {/* Copy button */}
                      <Button
                        size="icon"
                        variant="secondary"
                        disabled={!available}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 border border-border shadow-sm transition-all duration-200 ${
                          isCopied
                            ? "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30 hover:text-green-400"
                            : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        }`}
                        onClick={() => available && handleCopy(preset.command as string, preset.label)}
                        data-testid={`btn-copy-${preset.label.replace(/\s+/g, "-").toLowerCase()}`}
                        title={t.copyToClipboard}
                      >
                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!isTauri() && (
                <p className="text-[11px] text-muted-foreground italic pt-2">
                  {t.teamPresetsNote}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
