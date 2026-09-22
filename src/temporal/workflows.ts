import {
  proxyActivities,
  log,
} from "@temporalio/workflow";
import type { SupplierHotel, DeduplicatedHotel } from "../types/hotel";

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

export async function hotelComparisonWorkflow(city: string): Promise<DeduplicatedHotel[]> {
  log.info("Starting hotel comparison workflow", { city });

  // Use allSettled so one unavailable supplier does not discard the healthy
  // supplier's offers. Activity retries still apply before a result settles.
  const [supplierAResult, supplierBResult] = await Promise.allSettled([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  const hotelsA = supplierAResult.status === "fulfilled" ? supplierAResult.value : [];
  const hotelsB = supplierBResult.status === "fulfilled" ? supplierBResult.value : [];

  if (supplierAResult.status === "rejected") {
    log.warn("Supplier A failed; continuing with Supplier B results", {
      city,
      error: String(supplierAResult.reason),
    });
  }
  if (supplierBResult.status === "rejected") {
    log.warn("Supplier B failed; continuing with Supplier A results", {
      city,
      error: String(supplierBResult.reason),
    });
  }

  if (supplierAResult.status === "rejected" && supplierBResult.status === "rejected") {
    throw new Error("Both hotel suppliers failed");
  }

  log.info("Received supplier data", {
    city,
    supplierACount: hotelsA.length,
    supplierBCount: hotelsB.length,
  });

  const deduplicated = await deduplicateHotels(hotelsA, hotelsB);
  await saveToRedis(city, deduplicated);

  log.info("Workflow complete — results cached in Redis", { city, count: deduplicated.length });
  return deduplicated;
}
