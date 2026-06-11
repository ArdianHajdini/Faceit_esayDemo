import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openFile"),

  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:openFolder"),

  checkCs2Path: (cs2Path: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:checkCs2Path", cs2Path),

  writeCfg: (args: {
    cs2Path: string;
    filename: string;
    content: string;
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("fs:writeCfg", args),
});

// Type declaration for window.electronAPI (used by renderer)
declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<string | null>;
      openFolder: () => Promise<string | null>;
      checkCs2Path: (cs2Path: string) => Promise<boolean>;
      writeCfg: (args: {
        cs2Path: string;
        filename: string;
        content: string;
      }) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
