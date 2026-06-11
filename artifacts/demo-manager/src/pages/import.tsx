import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useImportDemo } from "@workspace/api-client-react";
import {
  UploadCloud,
  File,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  Cpu,
} from "lucide-react";

import { Input } from "@/components/ui/input";
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
import { parseDemoFile, type DemoMeta } from "@/lib/demo-parser";

interface ParsedInfo {
  filePath: string;
  fileName: string;
  meta: DemoMeta;
  map: string;
  team1Name: string;
  team2Name: string;
}

export default function ImportDemo() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const importDemoMutation = useImportDemo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedInfo | null>(null);
  const [parsing, setParsing] = useState(false);
  const [manualPath, setManualPath] = useState("");

  async function handleFile(file: File) {
    setParsing(true);
    setParsed(null);
    try {
      const meta = await parseDemoFile(file);
      const fileName = file.name;
      // Try to extract map from filename if not found in header
      let map = meta.map ?? "";
      if (!map) {
        const m = fileName.match(/de_[a-z0-9_]+|cs_[a-z0-9_]+/i);
        if (m) map = m[0].toLowerCase();
      }
      setParsed({
        filePath: (file as File & { path?: string }).path ?? file.name,
        fileName,
        meta,
        map,
        team1Name: "",
        team2Name: "",
      });
    } catch {
      toast({
        title: "Could not read file",
        description: "The file could not be parsed. Check that it's a valid .dem file.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleElectronBrowse() {
    if (!window.electronAPI) return;
    const filePath = await window.electronAPI.openFile();
    if (!filePath) return;

    setParsing(true);
    setParsed(null);
    try {
      // Read the first 32 KB via Electron IPC for header parsing
      const headResult = await window.electronAPI.readFileHead(filePath, 32768);
      const statResult = await window.electronAPI.statFile(filePath);

      const date = statResult.ok && statResult.mtime
        ? new Date(statResult.mtime)
        : new Date();

      let meta: DemoMeta = { format: "unknown", date };

      if (headResult.ok && headResult.data) {
        // Decode base64 → Uint8Array and run the same parser logic
        const binaryStr = atob(headResult.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        // Detect format
        const magic = new TextDecoder("latin1").decode(bytes.slice(0, 8));
        if (magic === "HL2DEMO\0") {
          const readStr = (offset: number, max: number) => {
            const sl = bytes.slice(offset, offset + max);
            const ni = sl.indexOf(0);
            return new TextDecoder("latin1").decode(sl.slice(0, ni >= 0 ? ni : max)).trim();
          };
          const serverName = readStr(16, 260);
          const mapName = readStr(536, 260);
          meta = { format: "HL2DEMO", map: mapName || undefined, serverName, date };
        } else if (magic === "PBDEMS2\0") {
          const text = new TextDecoder("latin1").decode(bytes);
          const m = text.match(/de_[a-z0-9_]{2,20}|cs_[a-z0-9_]{2,20}/);
          meta = { format: "PBDEMS2", map: m?.[0], date };
        }
      }

      const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
      let map = meta.map ?? "";
      if (!map) {
        const m = fileName.match(/de_[a-z0-9_]+|cs_[a-z0-9_]+/i);
        if (m) map = m[0].toLowerCase();
      }

      setParsed({ filePath, fileName, meta, map, team1Name: "", team2Name: "" });
    } catch (err) {
      toast({
        title: "Could not read file",
        description: "The file could not be parsed.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleManualPath() {
    const p = manualPath.trim();
    if (!p) return;
    const fileName = p.split(/[/\\]/).pop() ?? p;
    let map = "";
    const m = fileName.match(/de_[a-z0-9_]+|cs_[a-z0-9_]+/i);
    if (m) map = m[0].toLowerCase();
    setParsed({
      filePath: p,
      fileName,
      meta: { format: "unknown", date: new Date() },
      map,
      team1Name: "",
      team2Name: "",
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (!parsed) return;
    importDemoMutation.mutate(
      {
        data: {
          filePath: parsed.filePath,
          map: parsed.map || undefined,
          team1Name: parsed.team1Name || undefined,
          team2Name: parsed.team2Name || undefined,
          importedAt: parsed.meta.date.toISOString(),
        },
      },
      {
        onSuccess: (demo) => {
          toast({ title: "Demo imported", description: parsed.fileName });
          setLocation(`/demos/${demo.id}`);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({
            title: "Import failed",
            description: msg ?? "Something went wrong.",
            variant: "destructive",
          });
        },
      }
    );
  }

  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
          Import Demo
        </h1>
        <p className="text-muted-foreground mt-1">
          Select a .dem or .dem.gz file — map and date are read automatically from the file header.
        </p>
      </div>

      {/* ── Drop zone / picker ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            Select Demo File
          </CardTitle>
          <CardDescription>
            {isElectron
              ? "Click Browse to open a file dialog, or drag and drop a .dem / .gz file."
              : "Drag and drop a .dem file, or click to browse, or paste a file path below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer transition-colors hover:border-primary/60 hover:bg-primary/5"
            onClick={() => (isElectron ? handleElectronBrowse() : fileInputRef.current?.click())}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {parsing ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm">Reading file header…</span>
              </div>
            ) : parsed ? (
              <div className="flex flex-col items-center gap-2 text-sm">
                <CheckCircle2 className="w-8 h-8 text-primary" />
                <span className="font-mono font-semibold text-foreground">{parsed.fileName}</span>
                <span className="text-muted-foreground text-xs">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <File className="w-8 h-8" />
                <span className="text-sm">
                  {isElectron ? "Click to browse" : "Drop .dem / .gz here or click to browse"}
                </span>
                <span className="text-xs opacity-60">.dem · .dem.gz · .gz</span>
              </div>
            )}
          </div>

          {/* Hidden file input (browser only) */}
          {!isElectron && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".dem,.gz"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          )}

          {/* Electron browse button */}
          {isElectron && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleElectronBrowse}
              disabled={parsing}
            >
              <FolderOpen className="w-4 h-4" />
              Browse for file…
            </Button>
          )}

          {/* Manual path fallback (non-Electron) */}
          {!isElectron && (
            <div className="flex gap-2">
              <Input
                className="font-mono text-sm bg-secondary/30"
                placeholder="Or paste an absolute file path…"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualPath()}
              />
              <Button variant="outline" onClick={handleManualPath} disabled={!manualPath.trim()}>
                Use path
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Parsed info + editable fields ── */}
      {parsed && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Detected Metadata
            </CardTitle>
            <CardDescription>
              Values read from the file header. Edit anything that looks wrong before importing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-detected row */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-secondary/20 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                    Map
                  </p>
                  <p className="font-mono font-semibold text-foreground">
                    {parsed.map || (
                      <span className="text-muted-foreground italic">not detected</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                    Date
                  </p>
                  <p className="font-semibold text-foreground">
                    {parsed.meta.date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-xs font-mono">
                  Format: {parsed.meta.format}
                </Badge>
                {parsed.meta.serverName && (
                  <span className="ml-2 text-xs text-muted-foreground font-mono truncate">
                    {parsed.meta.serverName}
                  </span>
                )}
              </div>
            </div>

            {/* Editable map override */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Map <span className="normal-case opacity-60">(edit if wrong)</span>
              </label>
              <Input
                className="font-mono text-sm bg-secondary/30"
                placeholder="de_mirage"
                value={parsed.map}
                onChange={(e) => setParsed({ ...parsed, map: e.target.value })}
              />
            </div>

            {/* Team names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Team A
                </label>
                <Input
                  className="bg-secondary/30"
                  placeholder="e.g. NAVI"
                  value={parsed.team1Name}
                  onChange={(e) => setParsed({ ...parsed, team1Name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Team B
                </label>
                <Input
                  className="bg-secondary/30"
                  placeholder="e.g. FaZe"
                  value={parsed.team2Name}
                  onChange={(e) => setParsed({ ...parsed, team2Name: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary/90">
                Team names are not stored in the CS2 demo header — they come from game events
                deeper in the file. Enter them manually, or leave blank and add them later.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                className="font-bold uppercase tracking-wide px-8"
                onClick={handleSubmit}
                disabled={importDemoMutation.isPending}
              >
                {importDemoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import Demo"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
