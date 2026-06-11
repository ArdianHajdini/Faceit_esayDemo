import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import os from "os";

const isDev = process.env.NODE_ENV === "development";

// Common CS2 installation paths to probe on Windows
const CS2_CANDIDATE_PATHS = [
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
  "C:\\Program Files\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
  path.join(os.homedir(), "Steam\\steamapps\\common\\Counter-Strike Global Offensive"),
  "D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
  "D:\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
  "E:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
  "E:\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
];

function findCs2Path(): string | null {
  for (const candidate of CS2_CANDIDATE_PATHS) {
    // Check for cs2.exe or game/csgo directory as a reliable marker
    if (
      fs.existsSync(path.join(candidate, "cs2.exe")) ||
      fs.existsSync(path.join(candidate, "game", "csgo"))
    ) {
      return candidate;
    }
  }
  return null;
}

function getDownloadsFolder(): string {
  // Windows: %USERPROFILE%\Downloads
  // macOS/Linux: ~/Downloads
  return path.join(os.homedir(), "Downloads");
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0b",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, "app", "index.html");
    win.loadFile(indexPath);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/** Open a native file picker for .dem/.gz files */
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select FACEIT Demo File",
    filters: [
      { name: "CS2 Demo Files", extensions: ["dem", "gz"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

/** Open a native folder picker */
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Folder to Watch",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

/** Read the first N bytes of a file (for demo header parsing) */
ipcMain.handle(
  "fs:readFileHead",
  async (_event, filePath: string, bytes: number) => {
    try {
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(bytes);
      const read = fs.readSync(fd, buf, 0, bytes, 0);
      fs.closeSync(fd);
      // Return as Base64 so it can cross the IPC bridge
      return { ok: true, data: buf.slice(0, read).toString("base64") };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  }
);

/** Return file stat (mtime, size) */
ipcMain.handle("fs:stat", async (_event, filePath: string) => {
  try {
    const stat = fs.statSync(filePath);
    return { ok: true, mtime: stat.mtime.toISOString(), size: stat.size };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
});

/** Detect system default paths */
ipcMain.handle("system:getDefaults", async () => {
  const cs2Path = findCs2Path();
  const downloadsFolder = getDownloadsFolder();
  return { cs2Path, downloadsFolder };
});

/** Check if a path exists */
ipcMain.handle("fs:exists", async (_event, p: string) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

/** Ensure the replays folder exists inside the CS2 installation */
ipcMain.handle(
  "fs:ensureReplaysFolder",
  async (_event, cs2Path: string, subfolder: string) => {
    try {
      const replaysPath = path.join(cs2Path, "game", "csgo", subfolder);
      fs.mkdirSync(replaysPath, { recursive: true });
      return { ok: true, path: replaysPath };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  }
);

/** Write a .cfg alias file into CS2/game/csgo/cfg */
ipcMain.handle(
  "fs:writeCfg",
  async (
    _event,
    { cs2Path, filename, content }: { cs2Path: string; filename: string; content: string }
  ) => {
    try {
      const cfgDir = path.join(cs2Path, "game", "csgo", "cfg");
      if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(path.join(cfgDir, filename), content, "utf8");
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: (err as Error).message };
    }
  }
);

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
