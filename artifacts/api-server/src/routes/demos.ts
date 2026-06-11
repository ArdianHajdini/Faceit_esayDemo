import { Router } from "express";
import { db } from "@workspace/db";
import { demosTable, playersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  ListDemosResponseItem,
  GetDemoParams,
  GetDemoVoicePresetsParams,
  DeleteDemoParams,
  ImportDemoBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

router.get("/demos", async (req, res) => {
  try {
    const demos = await db
      .select({
        id: demosTable.id,
        filename: demosTable.filename,
        matchId: demosTable.matchId,
        map: demosTable.map,
        importedAt: demosTable.importedAt,
        status: demosTable.status,
        team1Name: demosTable.team1Name,
        team2Name: demosTable.team2Name,
        playerCount: count(playersTable.id),
      })
      .from(demosTable)
      .leftJoin(playersTable, eq(playersTable.demoId, demosTable.id))
      .groupBy(demosTable.id)
      .orderBy(sql`${demosTable.importedAt} desc`);

    res.json(
      demos.map((d) => ({
        ...d,
        importedAt: d.importedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list demos");
    res.status(500).json({ error: "Failed to list demos" });
  }
});

router.get("/demos/stats", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalDemos: count(demosTable.id),
      })
      .from(demosTable);

    const [ready] = await db
      .select({ readyDemos: count(demosTable.id) })
      .from(demosTable)
      .where(eq(demosTable.status, "ready"));

    const [players] = await db
      .select({ totalPlayers: count(playersTable.id) })
      .from(playersTable);

    const maps = await db
      .select({
        map: demosTable.map,
        count: count(demosTable.id),
      })
      .from(demosTable)
      .groupBy(demosTable.map)
      .orderBy(sql`count(${demosTable.id}) desc`);

    res.json({
      totalDemos: totals.totalDemos,
      readyDemos: ready.readyDemos,
      totalPlayers: players.totalPlayers,
      maps,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get demo stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/demos/:id", async (req, res) => {
  const parsed = GetDemoParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;

  try {
    const [demo] = await db
      .select()
      .from(demosTable)
      .where(eq(demosTable.id, id))
      .limit(1);

    if (!demo) {
      res.status(404).json({ error: "Demo not found" });
      return;
    }

    const players = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.demoId, id))
      .orderBy(playersTable.slot);

    res.json({
      ...demo,
      importedAt: demo.importedAt.toISOString(),
      players,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get demo");
    res.status(500).json({ error: "Failed to get demo" });
  }
});

router.post("/demos", async (req, res) => {
  const parsed = ImportDemoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { filePath, map, team1Name, team2Name } = parsed.data;

  const filename = filePath.split(/[/\\]/).pop() ?? filePath;

  try {
    const [demo] = await db
      .insert(demosTable)
      .values({
        filename,
        map: map ?? "unknown",
        status: "ready",
        team1Name: team1Name ?? null,
        team2Name: team2Name ?? null,
      })
      .returning();

    res.status(201).json({
      ...demo,
      importedAt: demo.importedAt.toISOString(),
      playerCount: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to import demo");
    res.status(500).json({ error: "Failed to import demo" });
  }
});

router.delete("/demos/:id", async (req, res) => {
  const parsed = DeleteDemoParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;

  try {
    await db.delete(demosTable).where(eq(demosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete demo");
    res.status(500).json({ error: "Failed to delete demo" });
  }
});

router.get("/demos/:id/voice-presets", async (req, res) => {
  const parsed = GetDemoVoicePresetsParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;

  try {
    const [demo] = await db
      .select()
      .from(demosTable)
      .where(eq(demosTable.id, id))
      .limit(1);

    if (!demo) {
      res.status(404).json({ error: "Demo not found" });
      return;
    }

    const players = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.demoId, id))
      .orderBy(playersTable.slot);

    const filename = demo.filename.replace(/\.gz$/, "");

    function buildMask(slots: number[]): { low: number; high: number } {
      let low = 0;
      let high = 0;
      for (const slot of slots) {
        if (slot < 32) {
          low |= 1 << slot;
        } else {
          high |= 1 << (slot - 32);
        }
      }
      return { low, high };
    }

    function makeCommand(
      indicesLow: number,
      indicesHigh: number,
      file: string
    ): string {
      return `tv_listen_voice_indices ${indicesLow}; tv_listen_voice_indices_h ${indicesHigh}; playdemo replays/${file}`;
    }

    const team1Players = players.filter((p) => p.team === 1);
    const team2Players = players.filter((p) => p.team === 2);
    const team1Slots = team1Players.map((p) => p.slot);
    const team2Slots = team2Players.map((p) => p.slot);
    const team1Mask = buildMask(team1Slots);
    const team2Mask = buildMask(team2Slots);

    const presets = [
      {
        label: "All Voices",
        description: "Hear all players in the demo",
        indicesLow: -1,
        indicesHigh: -1,
        command: makeCommand(-1, -1, filename),
      },
      {
        label: "No Voices",
        description: "Mute all voices",
        indicesLow: 0,
        indicesHigh: 0,
        command: makeCommand(0, 0, filename),
      },
      {
        label: demo.team1Name ?? "Team A",
        description: `Hear only ${demo.team1Name ?? "Team A"}`,
        indicesLow: team1Mask.low,
        indicesHigh: team1Mask.high,
        command: makeCommand(team1Mask.low, team1Mask.high, filename),
      },
      {
        label: demo.team2Name ?? "Team B",
        description: `Hear only ${demo.team2Name ?? "Team B"}`,
        indicesLow: team2Mask.low,
        indicesHigh: team2Mask.high,
        command: makeCommand(team2Mask.low, team2Mask.high, filename),
      },
    ];

    for (const player of players) {
      const mask = buildMask([player.slot]);
      presets.push({
        label: player.name,
        description: `Hear only ${player.name}`,
        indicesLow: mask.low,
        indicesHigh: mask.high,
        command: makeCommand(mask.low, mask.high, filename),
      });
    }

    res.json(presets);
  } catch (err) {
    req.log.error({ err }, "Failed to get voice presets");
    res.status(500).json({ error: "Failed to get voice presets" });
  }
});

export default router;
