import { Router, Request, Response } from "express";
import { supplierAData } from "../data/suppliers";
import logger from "../utils/logger";

const router = Router();

// Simulates an external Supplier A API
// GET /supplierA/hotels?city=delhi
router.get("/hotels", (req: Request, res: Response) => {
  const city = (req.query.city as string || "").toLowerCase().trim();

  logger.info({ supplier: "A", city }, "Supplier A request received");

  if (!city) {
    res.status(400).json({ error: "Query param 'city' is required" });
    return;
  }

  const hotels = supplierAData.filter((h) => h.city === city);
  logger.info({ supplier: "A", city, count: hotels.length }, "Supplier A returning hotels");

  res.json(hotels);
});

export default router;
