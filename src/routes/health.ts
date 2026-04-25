import { Router, Request, Response } from "express";
import logger from "../utils/logger";

const router = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  suppliers: {
    supplierA: { status: string; responseTimeMs?: number; error?: string };
    supplierB: { status: string; responseTimeMs?: number; error?: string };
  };
}

async function checkSupplier(name: string, url: string) {
  const start = Date.now();
  try {
    const response = await fetch(url);
    const responseTimeMs = Date.now() - start;
    if (response.ok) {
      return { status: "up", responseTimeMs };
    }
    return { status: "down", responseTimeMs, error: `HTTP ${response.status}` };
  } catch (error: any) {
    return { status: "down", responseTimeMs: Date.now() - start, error: error.message };
  }
}

// GET /health
router.get("/", async (_req: Request, res: Response) => {
  logger.info("Health check requested");

  const [supplierA, supplierB] = await Promise.all([
    checkSupplier("Supplier A", `${BASE_URL}/supplierA/hotels?city=test`),
    checkSupplier("Supplier B", `${BASE_URL}/supplierB/hotels?city=test`),
  ]);

  const allUp = supplierA.status === "up" && supplierB.status === "up";
  const allDown = supplierA.status === "down" && supplierB.status === "down";

  const health: HealthStatus = {
    status: allUp ? "healthy" : allDown ? "unhealthy" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    suppliers: { supplierA, supplierB },
  };

  const statusCode = allUp ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
