import { useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  UploadCloud,
  File as FileIcon,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Download,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadSettings, loadDemos } from "@/services/storage";
import {
  importDemoFromPath,
  buildDemoFromFile,
  addDemoToLibrary,
  formatFileSize,
} from "@/services/demoService";
import { isTauri } from "@/services/tauriBridge";
import {
  scanDownloadsFolder,
  type DownloadCandidate,
} from "@/services/downloadsService";

// ─────────────────────────────────────────
//  Types
// ─────────────────────────────────────────

type ScanState = "idle" | "scanning" | "ready";

interface ImportProgress {
  current: number;
  total: number;
  errors: number;
  skipped: number;
}

// ─────────────────────────────────────────
//  Page
// ─────────────────────────────────────────

export default function ImportDemo() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = loadSettings();
  const tauri = isTauri();

  // ── Single-file import ──
  const [importing, setImporting] = useState(false);
  const [importedName, setImportedName] = useState<string | null>(null);

  // ── Downloads scan ──
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [candidates, setCandidates] = useState<DownloadCandidate[]>([]);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  // ─────────────────────────────────────────
  //  Single-file handlers
  // ─────────────────────────────────────────

  async function importFile(file: File) {
    setImporting(true);
    setImportedName(null);
    try {
      const base = buildDemoFromFile(file, settings.demoDirectory || "demos");
      const demos = addDemoToLibrary(base);
      const created = demos.find((d) => d.filepath === base.filepath);
      setImportedName(file.name);
      toast({ title: "Demo added", description: file.name });
      setTimeout(() => setLocation("/"), 600);
    } catch {
      toast({
        title: "Import failed",
        description: "Could not add demo to library.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleTauriBrowse() {
    let path: string | null = null;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "CS2 Demo", extensions: ["dem", "gz", "zst"] }],
      });
      path = typeof selected === "string" ? selected : null;
    } catch (err) {
      toast({
        title: "Could not open file dialog",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
      return;
    }
    if (!path) return;

    setImporting(true);
    setImportedName(null);
    try {
      const demo = await importDemoFromPath(
        path,
        settings.demoDirectory,
        settings.autoExtractGz,
      );
      const fileName = path.split(/[/\\]/).pop() ?? path;
      setImportedName(fileName);
      toast({ title: "Demo imported", description: fileName });
      setTimeout(() => setLocation("/"), 600);
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (tauri) {
      // In Tauri we can't get a real path from a dropped File — fall back to browser import
      importFile(file);
    } else {
      importFile(file);
    }
  }

  // ─────────────────────────────────────────
  //  Downloads scan handlers
  // ─────────────────────────────────────────

  async function handleScan() {
    if (!settings.downloadsFolder) {
      toast({
        title: "Downloads folder not configured",
        description: "Set it in Settings first.",
        variant: "destructive",
      });
      return;
    }

    setScanState("scanning");
    setCandidates([]);
    setProgress(null);
    try {
      const result = await scanDownloadsFolder(settings.downloadsFolder);
      setCandidates(result.candidates);
      setScanState("ready");
      if (result.candidates.length === 0) {
        toast({
          title: "No demos found",
          description: `No .dem / .gz / .zst files found in ${settings.downloadsFolder}`,
        });
      }
    } catch (err) {
      setScanState("idle");
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  async function handleImportAll() {
    if (!candidates.length || !settings.demoDirectory) return;

    const total = candidates.length;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    setProgress({ current: 0, total, errors: 0, skipped: 0 });

    const existingDemos = loadDemos();

    for (const candidate of candidates) {
      // Skip demos already present in the library (same destination filename)
      const baseName = candidate.filename.replace(/\.(gz|zst)$/i, "");
      const alreadyImported = existingDemos.some(
        (d) => d.filename === baseName || d.filepath.toLowerCase().endsWith(baseName.toLowerCase()),
      );
      if (alreadyImported) {
        skipped++;
        setProgress({ current: imported + skipped + errors, total, errors, skipped });
        continue;
      }

      try {
        await importDemoFromPath(
          candidate.filepath,
          settings.demoDirectory,
          candidate.needsExtraction,
        );
        imported++;
      } catch {
        errors++;
      }
      setProgress({ current: imported + skipped + errors, total, errors, skipped });
    }

    toast({
      title: "Import complete",
      description: `${imported} imported · ${skipped} skipped · ${errors} failed`,
    });

    // Reset scan state and go to library
    setScanState("idle");
    setCandidates([]);
    setProgress(null);
    setLocation("/");
  }

  // ─────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────

  const downloadsConfigured = !!settings.downloadsFolder;
  const isImportingAll = progress !== null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
          Import Demo
        </h1>
        <p className="text-muted-foreground mt-1">
          Drop a single demo or scan your Downloads folder for new files.
        </p>
      </div>

      {/* ── Single file ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            Single Demo File
          </CardTitle>
          <CardDescription>
            {tauri
              ? "Click Browse or drag and drop a .dem / .gz file."
              : "Drag and drop a .dem file onto the zone below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer transition-colors hover:border-primary/60 hover:bg-primary/5"
            onClick={() => {
              if (importing) return;
              if (tauri) handleTauriBrowse();
              else fileInputRef.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {importing ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm">Importing…</span>
              </div>
            ) : importedName ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <CheckCircle2 className="w-8 h-8 text-primary" />
                <span className="font-mono font-semibold text-foreground">{importedName}</span>
                <span className="text-muted-foreground text-xs">Imported — redirecting…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <FileIcon className="w-8 h-8" />
                <span className="text-sm">
                  {tauri ? "Click to browse" : "Drop .dem / .gz here or click to browse"}
                </span>
                <span className="text-xs opacity-60">.dem · .dem.gz · .zst</span>
              </div>
            )}
          </div>

          {!tauri && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".dem,.gz,.zst"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
              }}
            />
          )}

          {tauri && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleTauriBrowse}
              disabled={importing}
            >
              <FolderOpen className="w-4 h-4" />
              Browse for file…
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Downloads Scan ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            Scan Downloads Folder
          </CardTitle>
          <CardDescription>
            Find all .dem / .gz / .zst files in your Downloads folder and import them at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Folder display */}
          <div className="flex items-center gap-2 p-3 rounded-md bg-secondary/20 border border-border">
            <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            {downloadsConfigured ? (
              <span className="font-mono text-xs text-foreground truncate flex-1">
                {settings.downloadsFolder}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic flex-1">
                Not configured —{" "}
                <Link href="/settings" className="text-primary underline underline-offset-2">
                  set it in Settings
                </Link>
              </span>
            )}
          </div>

          {!tauri && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary/90">
                Folder scanning requires the desktop app — not available in browser preview.
              </p>
            </div>
          )}

          {/* Scan button */}
          {scanState === "idle" && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleScan}
              disabled={!tauri || isImportingAll}
            >
              <ScanLine className="w-4 h-4" />
              Scan for Demos
            </Button>
          )}

          {scanState === "scanning" && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Scanning folder…</span>
            </div>
          )}

          {/* Candidate list */}
          {scanState === "ready" && candidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
                <span>{candidates.length} demo{candidates.length !== 1 ? "s" : ""} found</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setScanState("idle"); setCandidates([]); }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden divide-y divide-border max-h-60 overflow-y-auto">
                {candidates.map((c) => (
                  <div key={c.filepath} className="flex items-center justify-between px-3 py-2 text-sm bg-card hover:bg-secondary/30 transition-colors">
                    <span className="font-mono text-xs text-foreground truncate flex-1 mr-3">
                      {c.filename}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.needsExtraction && (
                        <Badge variant="outline" className="text-[9px] uppercase text-muted-foreground">
                          compressed
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatFileSize(c.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress display */}
              {isImportingAll ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      Importing {progress.current} of {progress.total}…
                    </span>
                    {progress.errors > 0 && (
                      <span className="text-destructive">{progress.errors} failed</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full font-bold uppercase tracking-wide gap-2"
                  onClick={handleImportAll}
                  disabled={!settings.demoDirectory}
                >
                  <Download className="w-4 h-4" />
                  Import All ({candidates.length})
                </Button>
              )}

              {!settings.demoDirectory && (
                <p className="text-xs text-destructive">
                  Demo directory not configured — set it in{" "}
                  <Link href="/settings" className="underline underline-offset-2">Settings</Link>.
                </p>
              )}
            </div>
          )}

          {scanState === "ready" && candidates.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No new .dem files found in the Downloads folder.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
