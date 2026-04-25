import { SupplierHotel, DeduplicatedHotel } from "../types/hotel";
import logger from "../utils/logger";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ─── Activity: Fetch hotels from Supplier A ───
export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  const url = `${BASE_URL}/supplierA/hotels?city=${encodeURIComponent(city)}`;
  logger.info({ activity: "fetchSupplierA", city, url }, "Fetching from Supplier A");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Supplier A returned status ${response.status}`);
    }
    const data = (await response.json()) as SupplierHotel[];
    logger.info({ activity: "fetchSupplierA", count: data.length }, "Supplier A responded");
    return data;
  } catch (error) {
    logger.error({ activity: "fetchSupplierA", error }, "Failed to fetch from Supplier A");
    throw error;
  }
}

// ─── Activity: Fetch hotels from Supplier B ───
export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  const url = `${BASE_URL}/supplierB/hotels?city=${encodeURIComponent(city)}`;
  logger.info({ activity: "fetchSupplierB", city, url }, "Fetching from Supplier B");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Supplier B returned status ${response.status}`);
    }
    const data = (await response.json()) as SupplierHotel[];
    logger.info({ activity: "fetchSupplierB", count: data.length }, "Supplier B responded");
    return data;
  } catch (error) {
    logger.error({ activity: "fetchSupplierB", error }, "Failed to fetch from Supplier B");
    throw error;
  }
}

// ─── Activity: Deduplicate hotels by name, keeping the cheaper one ───
export async function deduplicateHotels(
  hotelsA: SupplierHotel[],
  hotelsB: SupplierHotel[]
): Promise<DeduplicatedHotel[]> {
  logger.info(
    { activity: "deduplicateHotels", countA: hotelsA.length, countB: hotelsB.length },
    "Deduplicating hotels"
  );

  const hotelMap = new Map<string, DeduplicatedHotel>();

  // Index Supplier A hotels
  for (const hotel of hotelsA) {
    const key = hotel.name.toLowerCase();
    hotelMap.set(key, {
      name: hotel.name,
      price: hotel.price,
      supplier: "Supplier A",
      commissionPct: hotel.commissionPct,
    });
  }

  // Compare with Supplier B — keep cheaper price
  for (const hotel of hotelsB) {
    const key = hotel.name.toLowerCase();
    const existing = hotelMap.get(key);

    if (!existing || hotel.price < existing.price) {
      hotelMap.set(key, {
        name: hotel.name,
        price: hotel.price,
        supplier: "Supplier B",
        commissionPct: hotel.commissionPct,
      });
    }
  }

  const result = Array.from(hotelMap.values());
  logger.info({ activity: "deduplicateHotels", deduplicatedCount: result.length }, "Deduplication complete");
  return result;
}

// ─── Activity: Save deduplicated hotels to Redis (using sorted set for price filtering) ───
export async function saveToRedis(
  city: string,
  hotels: DeduplicatedHotel[]
): Promise<void> {
  // We import Redis inside the activity to avoid issues with Temporal's sandbox
  const Redis = (await import("ioredis")).default;
  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
  const redis = new Redis({ host: redisHost, port: redisPort });

  const key = `hotels:${city.toLowerCase()}`;

  logger.info({ activity: "saveToRedis", city, key, count: hotels.length }, "Saving hotels to Redis");

  try {
    // Clear existing data for this city
    await redis.del(key);

    if (hotels.length === 0) {
      logger.info({ activity: "saveToRedis", city }, "No hotels to save");
      await redis.quit();
      return;
    }

    // Use a sorted set: score = price, member = JSON of hotel
    const pipeline = redis.pipeline();
    for (const hotel of hotels) {
      pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
    }
    // Set TTL of 5 minutes
    pipeline.expire(key, 300);
    await pipeline.exec();

    logger.info({ activity: "saveToRedis", city, count: hotels.length }, "Hotels saved to Redis");
  } catch (error) {
    logger.error({ activity: "saveToRedis", error }, "Failed to save to Redis");
    throw error;
  } finally {
    await redis.quit();
  }
}
