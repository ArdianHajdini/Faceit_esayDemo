import { useState } from "react";
import {
  Settings as SettingsIcon,
  FolderOpen,
  Save,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Crosshair,
  User,
  Globe,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { loadSettings, saveSettings } from "@/services/storage";
import { isTauri, tauriDetectDownloadsFolder } from "@/services/tauriBridge";
import { detectCS2Path, getCS2Status } from "@/services/cs2Service";
import { useTranslation, LANGUAGES } from "@/services/i18n";

async function pickFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const sel = await open({ directory: true, multiple: false });
  return typeof sel === "string" ? sel : null;
}

async function pickExe(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const sel = await open({
    multiple: false,
    filters: [{ name: "CS2 Executable", extensions: ["exe"] }],
  });
  return typeof sel === "string" ? sel : null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const t = useTranslation();
  const initial = loadSettings();
  const tauri = isTauri();

  const [cs2Path, setCs2Path] = useState(initial.cs2Path);
  const [steamPath, setSteamPath] = useState(initial.steamPath);
  const [demoDirectory, setDemoDirectory] = useState(initial.demoDirectory);
  const [downloadsFolder, setDownloadsFolder] = useState(initial.downloadsFolder);
  const [autoExtractGz, setAutoExtractGz] = useState(initial.autoExtractGz);
  const [autoAddToLibrary, setAutoAddToLibrary] = useState(initial.autoAddToLibrary);
  const [steamId, setSteamId] = useState(initial.steamId);
  const [language, setLanguage] = useState(initial.language ?? "en");

  const [isDirty, setIsDirty] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const cs2Status = getCS2Status(cs2Path);

  async function handleAutoDetect() {
    setDetecting(true);
    try {
      const res = await detectCS2Path();
      if (res) {
        setCs2Path(res.cs2Path);
        setSteamPath(res.steamPath);
        setDemoDirectory(res.replayFolder);
        setIsDirty(true);
      }
      const dl = await tauriDetectDownloadsFolder();
      if (dl) {
        setDownloadsFolder(dl);
        setIsDirty(true);
      }
      toast({
        title: res ? t.autoDetectComplete : t.cs2NotFound,
        description: res ? res.cs2Path : t.enterPathsManually,
        variant: res ? undefined : "destructive",
      });
    } catch (err) {
      toast({
        title: t.autoDetectFailed,
        description: err instanceof Error ? err.message : t.somethingWentWrong,
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  }

  async function browseInto(setter: (v: string) => void, exe = false) {
    try {
      const path = exe ? await pickExe() : await pickFolder();
      if (path) {
        setter(path);
        setIsDirty(true);
      }
    } catch (err) {
      toast({
        title: t.couldNotOpenDialog,
        description: err instanceof Error ? err.message : t.somethingWentWrong,
        variant: "destructive",
      });
    }
  }

  function handleSave() {
    saveSettings({
      cs2Path,
      steamPath,
      demoDirectory,
      downloadsFolder,
      autoExtractGz,
      autoAddToLibrary,
      steamId,
      language,
    });
    toast({ title: t.settingsSaved });
    setIsDirty(false);
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
            {t.settingsTitle}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.settingsDesc}
          </p>
        </div>
        {tauri && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleAutoDetect}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {t.autoDetectAll}
          </Button>
        )}
      </div>

      {!tauri && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary/90">
            {t.browserPreviewNote}
          </p>
        </div>
      )}

      {/* ── Language ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t.languageTitle}
          </CardTitle>
          <CardDescription>
            {t.languageDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={language}
            onValueChange={(val) => {
              setLanguage(val);
              setIsDirty(true);
            }}
          >
            <SelectTrigger className="w-64 bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="font-medium">{lang.nativeLabel}</span>
                  <span className="text-muted-foreground ml-2 text-xs">— {lang.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── CS2 installation ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            {t.cs2InstallationTitle}
          </CardTitle>
          <CardDescription>
            {t.cs2InstallationDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.cs2ExePath}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SettingsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm bg-secondary/30"
                  placeholder={t.cs2ExePlaceholder}
                  value={cs2Path}
                  onChange={(e) => {
                    setCs2Path(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>
              {tauri && (
                <Button variant="outline" onClick={() => browseInto(setCs2Path, true)} className="shrink-0">
                  {t.browse}
                </Button>
              )}
            </div>
            {cs2Path && (
              <p className="text-xs font-mono mt-1 flex items-center gap-1.5">
                {cs2Status === "found" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary">{t.looksValid}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-destructive">{t.shouldPointToCs2}</span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.steamRoot}
            </label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-sm bg-secondary/30"
                placeholder={t.steamRootPlaceholder}
                value={steamPath}
                onChange={(e) => {
                  setSteamPath(e.target.value);
                  setIsDirty(true);
                }}
              />
              {tauri && (
                <Button variant="outline" onClick={() => browseInto(setSteamPath)} className="shrink-0">
                  {t.browse}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Folders ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            {t.foldersTitle}
          </CardTitle>
          <CardDescription>
            {t.foldersDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.demoDirectory}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm bg-secondary/30"
                  placeholder={t.demoDirectoryPlaceholder}
                  value={demoDirectory}
                  onChange={(e) => {
                    setDemoDirectory(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>
              {tauri && (
                <Button variant="outline" onClick={() => browseInto(setDemoDirectory)} className="shrink-0">
                  {t.browse}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.downloadsFolderLabel}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono text-sm bg-secondary/30"
                  placeholder={t.downloadsFolderPlaceholder}
                  value={downloadsFolder}
                  onChange={(e) => {
                    setDownloadsFolder(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>
              {tauri && (
                <Button variant="outline" onClick={() => browseInto(setDownloadsFolder)} className="shrink-0">
                  {t.browse}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Automation toggles ── */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-foreground">
                {t.autoExtractTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.autoExtractDesc}
              </p>
            </div>
            <Switch
              checked={autoExtractGz}
              onCheckedChange={(v) => {
                setAutoExtractGz(v);
                setIsDirty(true);
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-foreground">
                {t.autoAddTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.autoAddDesc}
              </p>
            </div>
            <Switch
              checked={autoAddToLibrary}
              onCheckedChange={(v) => {
                setAutoAddToLibrary(v);
                setIsDirty(true);
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Advanced ── */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <User className="w-4 h-4" />
            {t.advancedTitle}
          </CardTitle>
          <CardDescription>
            {t.advancedDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.steamId64}
            </label>
            <Input
              className="font-mono text-sm bg-secondary/30"
              placeholder={t.steamId64Placeholder}
              value={steamId}
              onChange={(e) => {
                setSteamId(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Save ── */}
      <div className="flex justify-end">
        <Button
          className="font-bold uppercase tracking-wide px-8 gap-2"
          onClick={handleSave}
          disabled={!isDirty}
        >
          <Save className="w-4 h-4" />
          {t.saveSettings}
        </Button>
      </div>
    </div>
  );
}
