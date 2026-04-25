import express from "express";
import logger from "./utils/logger";
import supplierARoutes from "./routes/supplierA";
import supplierBRoutes from "./routes/supplierB";
import hotelRoutes from "./routes/hotels";
import healthRoutes from "./routes/health";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Middleware ───
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// ─── Routes ───
app.use("/supplierA", supplierARoutes);
app.use("/supplierB", supplierBRoutes);
app.use("/api", hotelRoutes);
app.use("/health", healthRoutes);

// ─── Global error handler ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start server ───
app.listen(PORT, () => {
  logger.info(`🚀 Hotel Orchestrator API running on http://localhost:${PORT}`);
  logger.info(`📋 Supplier A: http://localhost:${PORT}/supplierA/hotels?city=delhi`);
  logger.info(`📋 Supplier B: http://localhost:${PORT}/supplierB/hotels?city=delhi`);
  logger.info(`🏨 Hotels API: http://localhost:${PORT}/api/hotels?city=delhi`);
  logger.info(`❤️  Health:     http://localhost:${PORT}/health`);
});

export default app;
