import { Router, Request, Response } from "express";
import { supplierBData } from "../data/suppliers";
import logger from "../utils/logger";

const router = Router();

// Simulates an external Supplier B API
// GET /supplierB/hotels?city=delhi
router.get("/hotels", (req: Request, res: Response) => {
  const city = (req.query.city as string || "").toLowerCase().trim();

  logger.info({ supplier: "B", city }, "Supplier B request received");

  if (!city) {
    res.status(400).json({ error: "Query param 'city' is required" });
    return;
  }

  const hotels = supplierBData.filter((h) => h.city === city);
  logger.info({ supplier: "B", city, count: hotels.length }, "Supplier B returning hotels");

  res.json(hotels);
});

export default router;
