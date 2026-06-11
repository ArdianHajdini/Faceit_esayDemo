import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";

const isDev = process.env.NODE_ENV === "development";

function getAppPath(): string {
  // In production: resources/app (extraResources destination)
  // In dev: serve from localhost
  if (isDev) return "";
  return path.join(process.resourcesPath, "app");
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
    icon: path.join(__dirname, "..", "assets", "icon.png"),
  });

  if (isDev) {
    // In dev, load from the Vite dev server
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // In production, load the built frontend from extraResources/app
    const indexPath = path.join(getAppPath(), "index.html");
    win.loadFile(indexPath);
  }

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

// IPC: open a file picker dialog for selecting .dem / .gz files
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select FACEIT Demo File",
    filters: [
      { name: "CS2 Demo Files", extensions: ["dem", "gz", "dem.gz"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC: open a folder picker for watched folder config
ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Folder to Watch",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC: check if CS2 path is valid
ipcMain.handle("fs:checkCs2Path", async (_event, cs2Path: string) => {
  try {
    return fs.existsSync(cs2Path);
  } catch {
    return false;
  }
});

// IPC: write a .cfg file to the CS2 cfg directory
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
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
