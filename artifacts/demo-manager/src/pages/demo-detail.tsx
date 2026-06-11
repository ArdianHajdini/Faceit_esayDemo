import { useParams, Link } from "wouter";
import { useGetDemo, useGetDemoVoicePresets, getGetDemoQueryKey, getGetDemoVoicePresetsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  Map as MapIcon, 
  Calendar, 
  Hash, 
  Activity,
  Mic,
  Copy,
  CheckCircle2,
  Users
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function DemoDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const { data: demo, isLoading: loadingDemo } = useGetDemo(id, { 
    query: { enabled: !!id, queryKey: getGetDemoQueryKey(id) } 
  });
  
  const { data: presets, isLoading: loadingPresets } = useGetDemoVoicePresets(id, {
    query: { enabled: !!id, queryKey: getGetDemoVoicePresetsQueryKey(id) }
  });

  const handleCopy = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedPreset(label);
    toast({ 
      title: "Command Copied!", 
      description: `CS2 voice preset for ${label} copied to clipboard.`,
    });
    setTimeout(() => setCopiedPreset(null), 2000);
  };

  if (loadingDemo) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

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

  // Split players into teams
  const team1Players = demo.players?.filter(p => p.team === 1) || [];
  const team2Players = demo.players?.filter(p => p.team === 2) || [];
  // Handling unassigned or spec
  const otherPlayers = demo.players?.filter(p => p.team !== 1 && p.team !== 2) || [];

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
              {demo.status === 'ready' && <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] tracking-wider">Ready</Badge>}
              {demo.status === 'pending' && <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">Parsing</Badge>}
              {demo.status === 'error' && <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">Error</Badge>}
              <span className="text-sm font-mono text-muted-foreground break-all">{demo.filename}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground uppercase">
              {demo.team1Name || 'Team A'} <span className="text-muted-foreground opacity-50 px-2">VS</span> {demo.team2Name || 'Team B'}
            </h1>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground font-medium uppercase tracking-wider">
            <div className="flex items-center">
              <MapIcon className="w-4 h-4 mr-2 text-primary" />
              {demo.map}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              {format(new Date(demo.importedAt), "MMM d, yyyy")}
            </div>
            {demo.matchId && (
              <div className="flex items-center">
                <Hash className="w-4 h-4 mr-2 text-primary" />
                {demo.matchId.substring(0, 8)}...
              </div>
            )}
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
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                
                {/* Team 1 */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                    {demo.team1Name || 'Team A'}
                  </h3>
                  <div className="space-y-1">
                    {team1Players.map(p => (
                      <div key={p.id} className="flex justify-between items-center py-2 px-3 hover:bg-secondary/50 rounded transition-colors group">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        <div className="flex space-x-3 text-xs font-mono text-muted-foreground">
                          <span title="Steam ID">{p.steamId}</span>
                          <span title="Slot" className="w-8 text-right">#{p.slot}</span>
                        </div>
                      </div>
                    ))}
                    {team1Players.length === 0 && <div className="text-muted-foreground text-sm py-4 italic">No players detected</div>}
                  </div>
                </div>

                {/* Team 2 */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-4 text-foreground border-b border-border pb-2 uppercase tracking-wide">
                    {demo.team2Name || 'Team B'}
                  </h3>
                  <div className="space-y-1">
                    {team2Players.map(p => (
                      <div key={p.id} className="flex justify-between items-center py-2 px-3 hover:bg-secondary/50 rounded transition-colors group">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                        <div className="flex space-x-3 text-xs font-mono text-muted-foreground">
                          <span title="Steam ID">{p.steamId}</span>
                          <span title="Slot" className="w-8 text-right">#{p.slot}</span>
                        </div>
                      </div>
                    ))}
                    {team2Players.length === 0 && <div className="text-muted-foreground text-sm py-4 italic">No players detected</div>}
                  </div>
                </div>

              </div>
              
              {otherPlayers.length > 0 && (
                <div className="p-4 border-t border-border bg-secondary/10">
                  <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Spectators / Unassigned</h3>
                  <div className="flex flex-wrap gap-2">
                    {otherPlayers.map(p => (
                      <Badge key={p.id} variant="outline" className="font-mono text-xs">{p.name}</Badge>
                    ))}
                  </div>
                </div>
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
                Copy these commands to your CS2 console to filter voice chat during demo playback.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {loadingPresets ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 mb-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : presets?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No voice presets available.</p>
                  <p className="text-xs mt-1">Demo may still be parsing or lacks voice data.</p>
                </div>
              ) : (
                presets?.map((preset) => (
                  <div key={preset.label} className="group">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{preset.description}</span>
                    </div>
                    <div className="relative">
                      <div className="bg-background border border-border rounded p-3 pr-12 font-mono text-xs text-muted-foreground break-all overflow-hidden max-h-24 hover:text-foreground transition-colors cursor-text selection:bg-primary/30">
                        {preset.command}
                      </div>
                      <Button 
                        size="icon" 
                        variant="secondary"
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 border border-border shadow-sm transition-all duration-200 ${
                          copiedPreset === preset.label ? "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30 hover:text-green-400" : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        }`}
                        onClick={() => handleCopy(preset.command, preset.label)}
                        data-testid={`btn-copy-${preset.label.replace(/\s+/g, '-').toLowerCase()}`}
                        title="Copy to console"
                      >
                        {copiedPreset === preset.label ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
