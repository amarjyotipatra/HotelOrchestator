import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getTemporalClient } from "../temporal/client";
import { DeduplicatedHotel } from "../types/hotel";
import redis from "../redis/client";
import logger from "../utils/logger";

const router = Router();
const TASK_QUEUE = "hotel-orchestrator";

function parsePrice(value: unknown): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

router.get("/hotels", async (req: Request, res: Response) => {
  const city = (req.query.city as string || "").toLowerCase().trim();
  const hasMinPrice = req.query.minPrice !== undefined;
  const hasMaxPrice = req.query.maxPrice !== undefined;
  const minPrice = parsePrice(req.query.minPrice);
  const maxPrice = parsePrice(req.query.maxPrice);

  if (!city) {
    res.status(400).json({ error: "Query parameter 'city' is required" });
    return;
  }

  if ((hasMinPrice && minPrice === undefined) || (hasMaxPrice && maxPrice === undefined)) {
    res.status(400).json({ error: "Price filters must be finite numbers" });
    return;
  }
  if (minPrice !== undefined && minPrice < 0 || maxPrice !== undefined && maxPrice < 0) {
    res.status(400).json({ error: "Price filters cannot be negative" });
    return;
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    res.status(400).json({ error: "'minPrice' must be less than or equal to 'maxPrice'" });
    return;
  }

  try {
    const workflowId = `hotel-comparison-${city}-${uuidv4()}`;
    const client = await getTemporalClient();
    const handle = await client.workflow.start("hotelComparisonWorkflow", {
      args: [city],
      taskQueue: TASK_QUEUE,
      workflowId,
    });
    const result: DeduplicatedHotel[] = await handle.result();

    if (minPrice !== undefined || maxPrice !== undefined) {
      const filtered = await redis.zrangebyscore(
        `hotels:${city}`,
        minPrice ?? 0,
        maxPrice ?? "+inf",
      );
      res.json(filtered.map((item) => JSON.parse(item) as DeduplicatedHotel));
      return;
    }

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, city }, "Hotel comparison workflow failed");

    if (error.message?.includes("Both hotel suppliers failed")) {
      res.status(503).json({ error: "Both hotel suppliers are unavailable" });
      return;
    }

    res.status(500).json({ error: "Failed to fetch hotel offers" });
  }
});

export default router;
