import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  /** Open a file picker dialog for .dem / .gz files. Returns the selected path or null. */
  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openFile"),

  /** Open a folder picker dialog. Returns the selected path or null. */
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openFolder"),

  /** Read the first `bytes` bytes of a file (for demo header parsing). Returns base64 string. */
  readFileHead: (
    filePath: string,
    bytes: number
  ): Promise<{ ok: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke("fs:readFileHead", filePath, bytes),

  /** Get file stat (mtime, size). */
  statFile: (
    filePath: string
  ): Promise<{ ok: boolean; mtime?: string; size?: number; error?: string }> =>
    ipcRenderer.invoke("fs:stat", filePath),

  /** Detect system defaults: CS2 installation path and Downloads folder. */
  getSystemDefaults: (): Promise<{
    cs2Path: string | null;
    downloadsFolder: string;
  }> => ipcRenderer.invoke("system:getDefaults"),

  /** Check whether a path exists on disk. */
  pathExists: (p: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:exists", p),

  /** Create the replays folder inside the CS2 installation. */
  ensureReplaysFolder: (
    cs2Path: string,
    subfolder: string
  ): Promise<{ ok: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke("fs:ensureReplaysFolder", cs2Path, subfolder),

  /** Write a .cfg alias file into CS2/game/csgo/cfg. */
  writeCfg: (args: {
    cs2Path: string;
    filename: string;
    content: string;
  }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("fs:writeCfg", args),
});

// Type declaration used by renderer code
declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<string | null>;
      openFolder: () => Promise<string | null>;
      readFileHead: (
        filePath: string,
        bytes: number
      ) => Promise<{ ok: boolean; data?: string; error?: string }>;
      statFile: (
        filePath: string
      ) => Promise<{ ok: boolean; mtime?: string; size?: number; error?: string }>;
      getSystemDefaults: () => Promise<{
        cs2Path: string | null;
        downloadsFolder: string;
      }>;
      pathExists: (p: string) => Promise<boolean>;
      ensureReplaysFolder: (
        cs2Path: string,
        subfolder: string
      ) => Promise<{ ok: boolean; path?: string; error?: string }>;
      writeCfg: (args: {
        cs2Path: string;
        filename: string;
        content: string;
      }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}
