import { useState } from "react";
import { Link } from "wouter";
import { 
  useListDemos, 
  useGetDemoStats, 
  useDeleteDemo, 
  getListDemosQueryKey,
  getGetDemoStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Map as MapIcon, Users, Trash2, ChevronRight, Activity, CalendarDays, Crosshair } from "lucide-react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function Library() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: demos, isLoading: loadingDemos } = useListDemos();
  const { data: stats, isLoading: loadingStats } = useGetDemoStats();
  const deleteDemo = useDeleteDemo();

  const filteredDemos = demos?.filter(demo => {
    const searchLower = search.toLowerCase();
    return (
      demo.map.toLowerCase().includes(searchLower) ||
      demo.filename.toLowerCase().includes(searchLower) ||
      (demo.team1Name && demo.team1Name.toLowerCase().includes(searchLower)) ||
      (demo.team2Name && demo.team2Name.toLowerCase().includes(searchLower))
    );
  });

  const handleDelete = (id: number) => {
    deleteDemo.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Demo deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListDemosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDemoStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to delete demo", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Demo Library</h1>
        <p className="text-muted-foreground mt-1">Manage and analyze your parsed CS2 match demos.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Demos</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{stats?.totalDemos || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Parsed Ready</CardTitle>
            <Crosshair className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{stats?.readyDemos || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Unique Players</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-3xl font-bold">{stats?.totalPlayers || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Top Map</CardTitle>
            <MapIcon className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold truncate">
                {stats?.maps && stats.maps.length > 0 ? stats.maps.sort((a,b)=>b.count - a.count)[0].map : "N/A"}
              </div>
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
              placeholder="Search by map, team, or filename..." 
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
            {loadingDemos ? (
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
            ) : filteredDemos?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No demos found</p>
                <p className="text-sm">Try adjusting your search or import a new demo.</p>
              </div>
            ) : (
              filteredDemos?.map((demo) => (
                <div key={demo.id} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-secondary rounded-md flex flex-col items-center justify-center border border-border shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">MAP</span>
                      <span className="text-sm font-bold truncate max-w-full px-1">{demo.map.replace('de_', '')}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/demos/${demo.id}`}>
                          <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                            {demo.team1Name || 'Team A'} <span className="text-muted-foreground px-1">vs</span> {demo.team2Name || 'Team B'}
                          </h3>
                        </Link>
                        {demo.status === 'ready' && <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 text-[10px] uppercase">Ready</Badge>}
                        {demo.status === 'pending' && <Badge variant="secondary" className="text-[10px] uppercase">Pending</Badge>}
                        {demo.status === 'error' && <Badge variant="destructive" className="text-[10px] uppercase">Error</Badge>}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center"><CalendarDays className="w-3 h-3 mr-1" /> {format(new Date(demo.importedAt), "MMM d, yyyy")}</span>
                        <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {demo.playerCount || 0} Players</span>
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
                            This will permanently remove the demo record from the database. The physical file will not be deleted.
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
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
