import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getTemporalClient } from "../temporal/client";
import { DeduplicatedHotel } from "../types/hotel";
import redis from "../redis/client";
import logger from "../utils/logger";

const router = Router();
const TASK_QUEUE = "hotel-orchestrator";

// GET /api/hotels?city=delhi&minPrice=5000&maxPrice=10000
router.get("/hotels", async (req: Request, res: Response) => {
  const city = (req.query.city as string || "").toLowerCase().trim();
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

  if (!city) {
    res.status(400).json({ error: "Query parameter 'city' is required" });
    return;
  }

  // Validate price range parameters
  if (minPrice !== undefined && isNaN(minPrice)) {
    res.status(400).json({ error: "'minPrice' must be a valid number" });
    return;
  }
  if (maxPrice !== undefined && isNaN(maxPrice)) {
    res.status(400).json({ error: "'maxPrice' must be a valid number" });
    return;
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    res.status(400).json({ error: "'minPrice' must be less than or equal to 'maxPrice'" });
    return;
  }

  try {
    const workflowId = `hotel-comparison-${city}-${uuidv4()}`;

    logger.info({ city, workflowId, minPrice, maxPrice }, "Starting hotel comparison workflow");

    // Start the Temporal workflow
    const client = await getTemporalClient();
    const handle = await client.workflow.start("hotelComparisonWorkflow", {
      args: [city],
      taskQueue: TASK_QUEUE,
      workflowId,
    });

    logger.info({ workflowId }, "Workflow started, awaiting result...");

    // Wait for the workflow to complete
    const result: DeduplicatedHotel[] = await handle.result();

    logger.info({ workflowId, resultCount: result.length }, "Workflow completed");

    // If price filters are specified, query Redis sorted set by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      const redisKey = `hotels:${city}`;
      const min = minPrice ?? 0;
      const max = maxPrice ?? "+inf";

      logger.info({ redisKey, min, max }, "Filtering by price range from Redis");

      const filtered = await redis.zrangebyscore(redisKey, min, max as any);
      const filteredHotels: DeduplicatedHotel[] = filtered.map((item) => JSON.parse(item));

      logger.info({ filteredCount: filteredHotels.length }, "Price-filtered results ready");

      res.json(filteredHotels);
      return;
    }

    // Return full deduplicated list
    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, city }, "Hotel comparison workflow failed");
    res.status(500).json({
      error: "Failed to fetch hotel offers",
      details: error.message,
    });
  }
});

export default router;
