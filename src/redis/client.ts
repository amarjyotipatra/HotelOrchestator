import Redis from "ioredis";
import logger from "../utils/logger";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    logger.warn(`Redis connection retry #${times}, next attempt in ${delay}ms`);
    return delay;
  },
});

redis.on("connect", () => logger.info("✅ Redis connected"));
redis.on("error", (err) => logger.error({ err }, "❌ Redis connection error"));

export default redis;
