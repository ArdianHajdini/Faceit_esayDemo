import { useEffect, useState } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import {
  Settings as SettingsIcon,
  FolderOpen,
  Save,
  Plus,
  X,
  Zap,
  FolderCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettingsMutation = useUpdateSettings();

  const [cs2Path, setCs2Path] = useState("");
  const [replaysSubfolder, setReplaysSubfolder] = useState("replays");
  const [autoImport, setAutoImport] = useState(false);
  const [watchedFolders, setWatchedFolders] = useState<string[]>([]);
  const [newFolder, setNewFolder] = useState("");

  const [detectingDefaults, setDetectingDefaults] = useState(false);
  const [creatingReplays, setCreatingReplays] = useState(false);
  const [replaysStatus, setReplaysStatus] = useState<
    "idle" | "ok" | "error"
  >("idle");
  const [isDirty, setIsDirty] = useState(false);

  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  // Populate form from fetched settings
  useEffect(() => {
    if (!settings) return;
    setCs2Path(settings.cs2Path ?? "");
    setReplaysSubfolder(settings.replaysSubfolder ?? "replays");
    setAutoImport(settings.autoImport ?? false);
    setWatchedFolders(settings.watchedFolders ?? []);
    setIsDirty(false);
  }, [settings]);

  // On first load in Electron: auto-detect paths if nothing is configured yet
  useEffect(() => {
    if (!isElectron || !settings) return;
    if (!settings.cs2Path && watchedFolders.length === 0) {
      detectSystemDefaults(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElectron, settings]);

  async function detectSystemDefaults(silent = false) {
    if (!window.electronAPI) return;
    setDetectingDefaults(true);
    try {
      const defaults = await window.electronAPI.getSystemDefaults();
      if (defaults.cs2Path && !cs2Path) {
        setCs2Path(defaults.cs2Path);
        setIsDirty(true);
      }
      if (
        defaults.downloadsFolder &&
        !watchedFolders.includes(defaults.downloadsFolder)
      ) {
        setWatchedFolders((prev) => {
          const next = [...prev, defaults.downloadsFolder];
          setIsDirty(true);
          return next;
        });
      }
      if (!silent) {
        toast({
          title: "Auto-detect complete",
          description: defaults.cs2Path
            ? `CS2 found at ${defaults.cs2Path}`
            : "CS2 not found — enter path manually.",
        });
      }
    } finally {
      setDetectingDefaults(false);
    }
  }

  async function handleBrowseCs2() {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.openFolder();
    if (folder) {
      setCs2Path(folder);
      setIsDirty(true);
    }
  }

  async function handleAddWatchedFolder() {
    if (!window.electronAPI && !newFolder.trim()) return;
    let folder = newFolder.trim();
    if (isElectron && !folder) {
      folder = (await window.electronAPI!.openFolder()) ?? "";
    }
    if (!folder || watchedFolders.includes(folder)) return;
    setWatchedFolders((prev) => [...prev, folder]);
    setNewFolder("");
    setIsDirty(true);
  }

  async function handleBrowseWatchedFolder() {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.openFolder();
    if (folder && !watchedFolders.includes(folder)) {
      setWatchedFolders((prev) => [...prev, folder]);
      setIsDirty(true);
    }
  }

  function removeWatchedFolder(idx: number) {
    setWatchedFolders((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  }

  async function handleEnsureReplaysFolder() {
    if (!window.electronAPI || !cs2Path) return;
    setCreatingReplays(true);
    setReplaysStatus("idle");
    try {
      const result = await window.electronAPI.ensureReplaysFolder(
        cs2Path,
        replaysSubfolder
      );
      if (result.ok) {
        setReplaysStatus("ok");
        toast({
          title: "Replays folder ready",
          description: result.path,
        });
      } else {
        setReplaysStatus("error");
        toast({
          title: "Failed to create replays folder",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setCreatingReplays(false);
    }
  }

  function handleSave() {
    updateSettingsMutation.mutate(
      {
        data: {
          cs2Path: cs2Path || undefined,
          watchedFolders,
          autoImport,
          replaysSubfolder,
        },
      },
      {
        onSuccess: (updated) => {
          toast({ title: "Settings saved" });
          queryClient.setQueryData(getGetSettingsQueryKey(), updated);
          setIsDirty(false);
        },
        onError: () => {
          toast({ title: "Failed to save settings", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto pb-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <Card className="border-border bg-card">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure paths and automation for Demo Manager.
          </p>
        </div>
        {isElectron && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => detectSystemDefaults(false)}
            disabled={detectingDefaults}
          >
            {detectingDefaults ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Auto-detect all
          </Button>
        )}
      </div>

      {/* ── CS2 path ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            CS2 Installation
          </CardTitle>
          <CardDescription>
            Path to your CS2 folder. Used to resolve the replays directory and write .cfg files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 font-mono text-sm bg-secondary/30"
                placeholder="C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive"
                value={cs2Path}
                onChange={(e) => {
                  setCs2Path(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
            {isElectron && (
              <Button variant="outline" onClick={handleBrowseCs2} className="shrink-0">
                Browse
              </Button>
            )}
          </div>

          {/* Replays subfolder */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Replays subfolder
            </label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-sm bg-secondary/30"
                placeholder="replays"
                value={replaysSubfolder}
                onChange={(e) => {
                  setReplaysSubfolder(e.target.value);
                  setIsDirty(true);
                }}
              />
              {isElectron && cs2Path && (
                <Button
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={handleEnsureReplaysFolder}
                  disabled={creatingReplays}
                >
                  {creatingReplays ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : replaysStatus === "ok" ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : replaysStatus === "error" ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <FolderCheck className="w-4 h-4" />
                  )}
                  Create folder
                </Button>
              )}
            </div>
            {cs2Path && replaysSubfolder && (
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Full path:{" "}
                <span className="text-foreground">
                  {cs2Path}\game\csgo\{replaysSubfolder}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Watched folders ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Watched Folders
          </CardTitle>
          <CardDescription>
            Folders monitored for new .dem and .gz files. Your Downloads folder is the default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {watchedFolders.length > 0 ? (
            <ul className="space-y-2">
              {watchedFolders.map((folder, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm font-mono bg-secondary/20 border border-border rounded px-3 py-2"
                >
                  <span className="text-foreground truncate flex-1 mr-2">{folder}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeWatchedFolder(i)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No folders configured. Add your Downloads folder to get started.
            </p>
          )}

          {/* Add folder */}
          <div className="flex gap-2">
            {!isElectron && (
              <Input
                className="font-mono text-sm bg-secondary/30"
                placeholder="Paste a folder path…"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleAddWatchedFolder()
                }
              />
            )}
            {isElectron ? (
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={handleBrowseWatchedFolder}
              >
                <Plus className="w-4 h-4" />
                Add folder…
              </Button>
            ) : (
              <Button
                variant="outline"
                className="shrink-0 gap-2"
                onClick={handleAddWatchedFolder}
                disabled={!newFolder.trim()}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-import toggle ── */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-foreground">
                Auto-Import
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically detect and import new .dem files from watched folders.
              </p>
            </div>
            <Switch
              checked={autoImport}
              onCheckedChange={(v) => {
                setAutoImport(v);
                setIsDirty(true);
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Save ── */}
      <div className="flex justify-end">
        <Button
          className="font-bold uppercase tracking-wide px-8 gap-2"
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending || !isDirty}
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
