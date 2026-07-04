import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Map as MapIcon,
  Trash2,
  ChevronRight,
  Activity,
  CalendarDays,
  HardDrive,
  Crosshair,
} from "lucide-react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { loadSettings, loadMetaCache, saveMetaCache } from "@/services/storage";
import type { MetaCacheEntry } from "@/services/storage";
import { loadDemosFromDisk, deleteDemoFull, formatFileSize } from "@/services/demoService";
import { isTauri, tauriParseDemoMeta, tauriDeleteDemoFile } from "@/services/tauriBridge";
import type { Demo } from "@/types/demo";

export default function Library() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const settings = loadSettings();
  const [metaEnrichment, setMetaEnrichment] = useState<Record<string, MetaCacheEntry>>(() => loadMetaCache());

  const { data: demos, isLoading } = useQuery({
    queryKey: ["demos", settings.demoDirectory],
    queryFn: () => loadDemosFromDisk(settings.demoDirectory),
  });

  const allDemos: Demo[] = demos ?? [];

  // Background meta enrichment: parse map + scores for demos that don't have them yet.
  useEffect(() => {
    if (!isTauri() || !demos || demos.length === 0) return;
    const effMap = (d: Demo) => d.map ?? metaEnrichment[d.filepath]?.map;
    const effScoreT = (d: Demo) => d.scoreT ?? metaEnrichment[d.filepath]?.scoreT;
    const effScoreCT = (d: Demo) => d.scoreCT ?? metaEnrichment[d.filepath]?.scoreCT;
    const toEnrich = demos.filter((d) => !effMap(d) || effScoreT(d) == null || effScoreCT(d) == null);
    if (toEnrich.length === 0) return;
    let active = true;
    const cache = { ...metaEnrichment };
    (async () => {
      for (const demo of toEnrich) {
        if (!active) break;
        try {
          const meta = await tauriParseDemoMeta(demo.filepath);
          if (active) {
            const entry: MetaCacheEntry = {};
            if (meta.map) entry.map = meta.map;
            if (meta.scoreT != null) entry.scoreT = meta.scoreT;
            if (meta.scoreCT != null) entry.scoreCT = meta.scoreCT;
            if (entry.map != null || entry.scoreT != null || entry.scoreCT != null) {
              cache[demo.filepath] = entry;
              setMetaEnrichment((prev) => ({ ...prev, [demo.filepath]: entry }));
              saveMetaCache(cache);
            }
          }
        } catch {
          // ignore parse errors for individual files
        }
      }
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demos]);

  const totalDemos = allDemos.length;
  const totalSize = allDemos.reduce((sum, d) => sum + (d.size || 0), 0);
  const mapsTracked = new Set(
    allDemos.filter((d) => d.map).map((d) => d.map as string),
  ).size;
  const topMap = (() => {
    const counts = new Map<string, number>();
    for (const d of allDemos) if (d.map) counts.set(d.map, (counts.get(d.map) || 0) + 1);
    let top = "N/A";
    let max = 0;
    for (const [m, c] of counts) if (c > max) { max = c; top = m; }
    return top;
  })();

  const filteredDemos = allDemos.filter((demo) => {
    const s = search.toLowerCase();
    const map = demo.map ?? metaEnrichment[demo.filepath]?.map;
    return (
      demo.displayName.toLowerCase().includes(s) ||
      demo.filename.toLowerCase().includes(s) ||
      (map && map.toLowerCase().includes(s)) ||
      (demo.team1Name && demo.team1Name.toLowerCase().includes(s)) ||
      (demo.team2Name && demo.team2Name.toLowerCase().includes(s))
    );
  });

  const handleDelete = async (id: string) => {
    const demo = allDemos.find((d) => d.id === id);
    try {
      await deleteDemoFull(allDemos, id);

      // Also remove the compressed source from the downloads folder if present
      if (isTauri() && demo && settings.downloadsFolder) {
        const sep = settings.downloadsFolder.includes("/") ? "/" : "\\";
        for (const ext of [".gz", ".zst"]) {
          tauriDeleteDemoFile(`${settings.downloadsFolder}${sep}${demo.filename}${ext}`).catch(() => {});
        }
      }

      toast({ title: "Demo gelöscht" });
      queryClient.invalidateQueries({ queryKey: ["demos"] });
    } catch {
      toast({ title: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Demo Library</h1>
        <p className="text-muted-foreground mt-1">Manage and analyze your local CS2 match demos.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Demos</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{totalDemos}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Size</CardTitle>
            <HardDrive className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{formatFileSize(totalSize)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Maps Tracked</CardTitle>
            <Crosshair className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{mapsTracked}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Top Map</CardTitle>
            <MapIcon className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold truncate">{topMap}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demo List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, map, team, or filename..."
              className="pl-9 bg-card/50 border-border font-mono text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-demos"
            />
          </div>
          <Link href="/import">
            <Button className="font-bold uppercase tracking-wide">Import Demo</Button>
          </Link>
        </div>

        <Card className="border-border bg-card">
          <div className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))
            ) : filteredDemos.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No demos found</p>
                <p className="text-sm">
                  Try adjusting your search or import a new demo. In the browser preview the
                  library is empty — run the desktop app to scan your CS2 replay folder.
                </p>
              </div>
            ) : (
              filteredDemos.map((demo) => {
                const hasTeams = !!(demo.team1Name || demo.team2Name);
                return (
                  <div key={demo.id} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-14 bg-secondary rounded-md flex flex-col items-center justify-center border border-border shrink-0 px-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MAP</span>
                          <span className="text-xs font-bold text-center leading-tight w-full text-center">
                            {(() => {
                              const m = demo.map ?? metaEnrichment[demo.filepath]?.map;
                              if (!m) return "…";
                              return m.replace(/^(de_|cs_|aim_)/, "");
                            })()}
                          </span>
                        </div>

                        {/* Score badge */}
                        {(() => {
                          const st = demo.scoreT ?? metaEnrichment[demo.filepath]?.scoreT;
                          const sct = demo.scoreCT ?? metaEnrichment[demo.filepath]?.scoreCT;
                          const hasAnyScore = st != null || sct != null;
                          const hasBothScores = st != null && sct != null;

                          if (!hasAnyScore) return null;

                          if (!hasBothScores) {
                            return (
                              <div className="flex items-center justify-center bg-primary/5 border border-primary/10 rounded-md px-2 shrink-0 h-14 w-16">
                                <Skeleton className="h-4 w-8" />
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center space-x-1 bg-primary/10 border border-primary/20 rounded-md px-2 py-1 shrink-0 h-14">
                              <span className="text-sm font-bold text-primary tabular-nums">{sct}</span>
                              <span className="text-xs text-muted-foreground font-medium">–</span>
                              <span className="text-sm font-bold text-primary tabular-nums">{st}</span>
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/demos/${demo.id}`}>
                            <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                              {hasTeams ? (
                                <>
                                  {demo.team1Name || "Team A"}
                                  <span className="text-muted-foreground px-1">vs</span>
                                  {demo.team2Name || "Team B"}
                                </>
                              ) : (
                                demo.displayName
                              )}
                            </h3>
                          </Link>
                          <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 text-[10px] uppercase">Ready</Badge>
                        </div>

                        <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center"><CalendarDays className="w-3 h-3 mr-1" /> {format(new Date(demo.modifiedAt), "MMM d, yyyy")}</span>
                          <span className="flex items-center"><HardDrive className="w-3 h-3 mr-1" /> {formatFileSize(demo.size)}</span>
                          <span className="truncate max-w-[200px]" title={demo.filename}>{demo.filename}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Demo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the demo from your library. In the desktop app the
                              demo file is also deleted from disk.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-0">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(demo.id)}
                              data-testid={`btn-delete-demo-${demo.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Link href={`/demos/${demo.id}`}>
                        <Button variant="secondary" className="font-bold uppercase text-xs tracking-wider">
                          View <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
