import { Connection, Client } from "@temporalio/client";
import logger from "../utils/logger";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  logger.info({ address: TEMPORAL_ADDRESS }, "Connecting Temporal client");

  const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
  client = new Client({ connection });

  logger.info("✅ Temporal client connected");
  return client;
}
