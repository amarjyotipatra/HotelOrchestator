import {
  proxyActivities,
  log,
} from "@temporalio/workflow";
import type { SupplierHotel, DeduplicatedHotel } from "../types/hotel";

// ─── Proxy activities so Temporal can intercept and schedule them ───
const {
  fetchSupplierA,
  fetchSupplierB,
  deduplicateHotels,
  saveToRedis,
} = proxyActivities<{
  fetchSupplierA: (city: string) => Promise<SupplierHotel[]>;
  fetchSupplierB: (city: string) => Promise<SupplierHotel[]>;
  deduplicateHotels: (a: SupplierHotel[], b: SupplierHotel[]) => Promise<DeduplicatedHotel[]>;
  saveToRedis: (city: string, hotels: DeduplicatedHotel[]) => Promise<void>;
}>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1s",
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

// ─── Workflow: Hotel Comparison Orchestrator ───
export async function hotelComparisonWorkflow(city: string): Promise<DeduplicatedHotel[]> {
  log.info("Starting hotel comparison workflow", { city });

  // Step 1: Fetch from both suppliers in parallel
  log.info("Fetching from Supplier A and B in parallel", { city });
  const [hotelsA, hotelsB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  log.info("Received supplier data", {
    city,
    supplierACount: hotelsA.length,
    supplierBCount: hotelsB.length,
  });

  // Step 2: Deduplicate — keep cheapest per hotel name
  const deduplicated = await deduplicateHotels(hotelsA, hotelsB);

  log.info("Deduplication complete", { city, count: deduplicated.length });

  // Step 3: Save to Redis for price filtering
  await saveToRedis(city, deduplicated);

  log.info("Workflow complete — results cached in Redis", { city });

  return deduplicated;
}
