import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import logger from "../utils/logger";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = "hotel-orchestrator";

async function runWorker() {
  logger.info({ address: TEMPORAL_ADDRESS, taskQueue: TASK_QUEUE }, "Starting Temporal worker");

  const connection = await NativeConnection.connect({ address: TEMPORAL_ADDRESS });

  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: TASK_QUEUE,
    connection,
  });

  logger.info("✅ Temporal worker started, listening for tasks...");
  await worker.run();
}

runWorker().catch((err) => {
  logger.error({ err }, "❌ Temporal worker failed");
  process.exit(1);
});
