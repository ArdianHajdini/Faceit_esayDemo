import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function ensureSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (!existing) {
    const [created] = await db
      .insert(settingsTable)
      .values({
        cs2Path: null,
        watchedFolders: "[]",
        autoImport: false,
        replaysSubfolder: "replays",
      })
      .returning();
    return created;
  }
  return existing;
}

router.get("/settings", async (req, res) => {
  try {
    const settings = await ensureSettings();
    res.json({
      cs2Path: settings.cs2Path,
      watchedFolders: JSON.parse(settings.watchedFolders),
      autoImport: settings.autoImport,
      replaysSubfolder: settings.replaysSubfolder,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/settings", async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { cs2Path, watchedFolders, autoImport, replaysSubfolder } = parsed.data;

  try {
    const existing = await ensureSettings();

    const [updated] = await db
      .update(settingsTable)
      .set({
        ...(cs2Path !== undefined ? { cs2Path } : {}),
        ...(watchedFolders !== undefined
          ? { watchedFolders: JSON.stringify(watchedFolders) }
          : {}),
        ...(autoImport !== undefined ? { autoImport } : {}),
        ...(replaysSubfolder !== undefined ? { replaysSubfolder } : {}),
      })
      .returning();

    const row = updated ?? existing;
    res.json({
      cs2Path: row.cs2Path,
      watchedFolders: JSON.parse(row.watchedFolders),
      autoImport: row.autoImport,
      replaysSubfolder: row.replaysSubfolder,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
