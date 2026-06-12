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
  Play,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadDemos, loadSettings } from "@/services/storage";
import { formatFileSize } from "@/services/demoService";
import {
  isTauri,
  tauriParseDemoPlayers,
  tauriLaunchCS2,
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

async function loadPlayers(filepath: string): Promise<TauriDemoPlayer[]> {
  if (!isTauri()) return [];
  const cached = getCachedPlayers(filepath);
  if (cached) return cached;
  const players = await tauriParseDemoPlayers(filepath);
  setCachedPlayers(filepath, players);
  return players;
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

export default function DemoDetail() {
  const params = useParams();
  const id = params.id ?? "";
  const { toast } = useToast();

  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [launchingPreset, setLaunchingPreset] = useState<string | null>(null);

  const demo = useMemo(() => loadDemos().find((d) => d.id === id) ?? null, [id]);
  const settings = useMemo(() => loadSettings(), []);

  // CS2's playdemo expects "replays/<name>" without the .dem extension
  const playdemoArg = useMemo(
    () => demo ? `replays/${demo.filename.replace(/\.dem$/i, "")}` : "",
    [demo],
  );

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["players", demo?.filepath],
    queryFn: () => loadPlayers(demo!.filepath),
    enabled: !!demo,
  });

  const rosters = players ? buildRosters(players) : null;
  const presets = VOICE_OPTIONS.map((opt) => {
    const toHear = getPlayersToHear(opt.mode, rosters);
    return {
      mode: opt.mode,
      label: opt.label,
      description: opt.description,
      command: buildFullPlayCommand(playdemoArg, opt.mode, toHear),
    };
  });

  const handleCopy = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedPreset(label);
    toast({
      title: "In Zwischenablage kopiert",
      description: `Preset "${label}" — einfügen in die CS2-Konsole.`,
    });
    setTimeout(() => setCopiedPreset(null), 2000);
  };

  const handleLaunchCS2 = async (command: string, label: string) => {
    if (!settings.cs2Path) {
      toast({
        title: "CS2-Pfad nicht konfiguriert",
        description: "Gehe zu den Einstellungen und hinterlege den CS2-Pfad.",
        variant: "destructive",
      });
      return;
    }
    setLaunchingPreset(label);
    try {
      // Copy full command to clipboard as safety fallback
      await navigator.clipboard.writeText(command);
      const result = await tauriLaunchCS2(settings.cs2Path, playdemoArg);
      if (result.status === "launched") {
        toast({
          title: "CS2 wird gestartet",
          description: `Demo läuft mit Preset "${label}". Befehl auch in der Zwischenablage.`,
        });
      } else {
        toast({
          title: "CS2 konnte nicht gestartet werden",
          description: "Befehl wurde in die Zwischenablage kopiert — bitte manuell in die Konsole einfügen.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Fehler beim Starten",
        description: "Befehl in die Zwischenablage kopiert als Fallback.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setLaunchingPreset(null), 2000);
    }
  };

  if (!demo) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Demo not found</h2>
        <p className="text-muted-foreground mt-2">The requested demo does not exist or was deleted.</p>
        <Link href="/">
          <Button className="mt-6">Return to Library</Button>
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
          Back to Library
        </Button>
      </Link>

      {/* Header Card */}
      <div className="bg-card border border-border p-6 rounded-lg shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 blur-3xl -z-10 rounded-full translate-x-1/2"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] tracking-wider">Ready</Badge>
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
              {demo.map || "—"}
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
        {/* Left Column - Players */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4 bg-secondary/20">
              <CardTitle className="uppercase tracking-wider text-sm flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                Match Roster
              </CardTitle>
              <CardDescription className="text-xs">
                Parsed from the demo file. Team T / CT come from the in-demo team number.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPlayers ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm">Parsing demo players…</span>
                </div>
              ) : !isTauri() ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Player parsing runs in the desktop app.</p>
                  <p className="text-xs mt-1">Open this demo in FACEIT easyDemo to read the roster.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                    {/* Terrorists */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                        {demo.team1Name || "Terrorists"}
                      </h3>
                      <div className="space-y-1">
                        {terrorists.map((p) => (
                          <PlayerRow key={`${p.xuid}-${p.entityId}`} p={p} />
                        ))}
                        {terrorists.length === 0 && (
                          <div className="text-muted-foreground text-sm py-4 italic">No players detected</div>
                        )}
                      </div>
                    </div>

                    {/* Counter-Terrorists */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                        {demo.team2Name || "Counter-Terrorists"}
                      </h3>
                      <div className="space-y-1">
                        {counterTerrorists.map((p) => (
                          <PlayerRow key={`${p.xuid}-${p.entityId}`} p={p} />
                        ))}
                        {counterTerrorists.length === 0 && (
                          <div className="text-muted-foreground text-sm py-4 italic">No players detected</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {others.length > 0 && (
                    <div className="p-4 border-t border-border bg-secondary/10">
                      <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Spectators / Unassigned</h3>
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
        </div>

        {/* Right Column - Voice Presets */}
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border pb-4 bg-primary/10">
              <CardTitle className="uppercase tracking-wider text-sm flex items-center text-primary font-bold">
                <Mic className="w-4 h-4 mr-2" />
                Voice Presets
              </CardTitle>
              <CardDescription className="text-xs">
                Vollständiger Befehl inkl. <code className="font-mono">playdemo</code> — kopieren oder direkt in CS2 starten.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {presets.map((preset) => {
                const available = preset.command !== null;
                const isCopied = copiedPreset === preset.label;
                const isLaunching = launchingPreset === preset.label;
                return (
                  <div key={preset.label} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right max-w-[55%]">{preset.description}</span>
                    </div>
                    <div className="relative">
                      <div className={`bg-background border border-border rounded p-3 font-mono text-xs text-muted-foreground break-all overflow-hidden max-h-24 hover:text-foreground transition-colors cursor-text selection:bg-primary/30 ${isTauri() ? "pr-20" : "pr-12"}`}>
                        {available ? preset.command : "Nicht verfügbar — keine Voice-Slots für dieses Team gefunden."}
                      </div>

                      {/* Copy button */}
                      <Button
                        size="icon"
                        variant="secondary"
                        disabled={!available}
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 border border-border shadow-sm transition-all duration-200 ${isTauri() ? "right-10" : "right-1.5"} ${
                          isCopied
                            ? "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30 hover:text-green-400"
                            : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        }`}
                        onClick={() => available && handleCopy(preset.command as string, preset.label)}
                        data-testid={`btn-copy-${preset.label.replace(/\s+/g, "-").toLowerCase()}`}
                        title="In Zwischenablage kopieren"
                      >
                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>

                      {/* Launch in CS2 button — desktop only */}
                      {isTauri() && (
                        <Button
                          size="icon"
                          variant="secondary"
                          disabled={!available || isLaunching}
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 border border-border shadow-sm transition-all duration-200 ${
                            isLaunching
                              ? "bg-primary/20 text-primary border-primary/50"
                              : !settings.cs2Path
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          }`}
                          onClick={() => available && handleLaunchCS2(preset.command as string, preset.label)}
                          data-testid={`btn-launch-${preset.label.replace(/\s+/g, "-").toLowerCase()}`}
                          title={settings.cs2Path ? "In CS2 starten" : "CS2-Pfad in Einstellungen konfigurieren"}
                        >
                          {isLaunching
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : !settings.cs2Path
                            ? <Settings className="w-4 h-4" />
                            : <Play className="w-4 h-4" />
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!isTauri() && (
                <p className="text-[11px] text-muted-foreground italic pt-2">
                  Team-spezifische Presets benötigen geparste Voice-Slots — nur in der Desktop-App verfügbar.
                </p>
              )}
              {isTauri() && !settings.cs2Path && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <Settings className="w-3 h-3 shrink-0" />
                  <span>
                    CS2-Pfad fehlt —{" "}
                    <Link href="/settings" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Einstellungen öffnen
                    </Link>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
