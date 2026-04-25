# 🏨 Hotel Offer Orchestrator

A backend system that aggregates overlapping hotel offers from two mock suppliers, deduplicates hotels by name, and selects the best-priced offer per hotel using **Temporal.io** for workflow orchestration and **Redis** for caching/filtering.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (TypeScript) |
| API Framework | Express.js |
| Workflow Engine | Temporal.io |
| Cache / Filtering | Redis (Sorted Sets) |
| Containerization | Docker & Docker Compose |
| Logging | Pino |

---

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────────────┐
│   Client     │────▶│  Express API Server (:3000)                     │
│  (Postman)   │     │  ├── GET /api/hotels?city=...                   │
│              │◀────│  ├── GET /supplierA/hotels?city=...             │
└──────────────┘     │  ├── GET /supplierB/hotels?city=...             │
                     │  └── GET /health                                │
                     └────────────────┬───────────────────────────────┘
                                      │
                     ┌────────────────▼───────────────────────────────┐
                     │  Temporal Workflow (hotelComparisonWorkflow)    │
                     │  1. Fetch Supplier A  ──┐                      │
                     │  2. Fetch Supplier B  ──┤  (parallel)          │
                     │  3. Deduplicate (cheapest wins)                │
                     │  4. Save to Redis (sorted set by price)        │
                     └────────────────┬───────────────────────────────┘
                                      │
                     ┌────────────────▼───────────────────────────────┐
                     │  Redis                                         │
                     │  • Sorted Set: hotels:{city}                   │
                     │  • Score = price → ZRANGEBYSCORE for filtering  │
                     │  • TTL = 5 minutes                             │
                     └────────────────────────────────────────────────┘
```

---

## Quick Start (Docker Compose)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/Hotel-Orchestator.git
cd Hotel-Orchestator
```

### 2. Build and start all services
```bash
docker-compose up --build
```

This starts **5 services**:
| Service | Port | Description |
|---------|------|-------------|
| `api` | 3000 | Express API server |
| `worker` | — | Temporal worker (no exposed port) |
| `temporal` | 7233 | Temporal server |
| `temporal-ui` | 8080 | Temporal Web UI |
| `redis` | 6379 | Redis cache |

### 3. Wait for services to be ready
The Temporal server takes ~30 seconds to initialize. Watch the logs:
```bash
docker-compose logs -f
```

### 4. Test the API
```bash
# Deduplicated hotels for Delhi
curl http://localhost:3000/api/hotels?city=delhi

# Price-filtered hotels (₹5000–₹9000)
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=9000"

# Health check
curl http://localhost:3000/health
```

---

## Local Development (Without Docker)

### Prerequisites
- Node.js 20+
- Redis running on localhost:6379
- Temporal server running on localhost:7233

### 1. Install dependencies
```bash
npm install
```

### 2. Start Redis (if not already running)
```bash
redis-server
```

### 3. Start Temporal dev server
```bash
temporal server start-dev
```

### 4. Build the project
```bash
npm run build
```

### 5. Start the API server
```bash
npm start
```

### 6. Start the Temporal worker (separate terminal)
```bash
npm run worker:prod
```

---

## API Endpoints

### `GET /api/hotels?city={city}`
Fetch deduplicated hotels for a city. Orchestrated by Temporal.

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `city` | ✅ | City name (e.g., `delhi`, `mumbai`, `bangalore`) |
| `minPrice` | ❌ | Minimum price filter |
| `maxPrice` | ❌ | Maximum price filter |

**Example Response:**
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  }
]
```

### `GET /supplierA/hotels?city={city}`
Mock Supplier A endpoint. Returns static hotel data.

### `GET /supplierB/hotels?city={city}`
Mock Supplier B endpoint. Returns static hotel data.

### `GET /health`
Health check endpoint reporting status of both suppliers.

**Example Response:**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2026-04-25T07:00:00.000Z",
  "suppliers": {
    "supplierA": { "status": "up", "responseTimeMs": 5 },
    "supplierB": { "status": "up", "responseTimeMs": 3 }
  }
}
```

---

## Workflow Logic

1. **Parallel Fetch**: Supplier A and Supplier B are called in parallel via Temporal activities
2. **Deduplication**: Hotels are indexed by name (case-insensitive)
   - If a hotel appears in both suppliers → the **cheaper** one wins
   - If only in one supplier → that one is selected
3. **Redis Cache**: Results are saved as a Redis Sorted Set (`hotels:{city}`) with price as score
4. **Price Filtering**: When `minPrice`/`maxPrice` are provided, `ZRANGEBYSCORE` retrieves matching hotels directly from Redis

---

## Available Cities (Mock Data)

| City | Supplier A Hotels | Supplier B Hotels | Overlapping Names |
|------|-------------------|-------------------|-------------------|
| `delhi` | 5 | 5 | Holtin, Radison, Taj Mahal Palace, The Leela |
| `mumbai` | 3 | 3 | The Oberoi, Trident |
| `bangalore` | 2 | 2 | Hyatt Regency |

---

## Postman Collection

Import `postman/Hotel_Orchestrator.postman_collection.json` into Postman.

**Test cases included:**
- ✅ Delhi hotels (with overlapping suppliers)
- ✅ Price range filtering
- ✅ Mumbai & Bangalore hotels
- ✅ City with no results (`goa`)
- ✅ Missing city parameter (400 error)
- ✅ Invalid price range (400 error)
- ✅ Health check

---

## Project Structure

```
Hotel-Orchestator/
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── data/
│   │   └── suppliers.ts         # Static mock hotel data
│   ├── redis/
│   │   └── client.ts            # Redis client configuration
│   ├── routes/
│   │   ├── health.ts            # GET /health
│   │   ├── hotels.ts            # GET /api/hotels
│   │   ├── supplierA.ts         # GET /supplierA/hotels
│   │   └── supplierB.ts        # GET /supplierB/hotels
│   ├── temporal/
│   │   ├── activities.ts        # Temporal activities (fetch, dedupe, cache)
│   │   ├── client.ts            # Temporal client factory
│   │   ├── worker.ts            # Temporal worker process
│   │   └── workflows.ts         # Hotel comparison workflow
│   ├── types/
│   │   └── hotel.ts             # TypeScript interfaces
│   └── utils/
│       └── logger.ts            # Pino logger configuration
├── postman/
│   └── Hotel_Orchestrator.postman_collection.json
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml           # Full stack: API + Worker + Temporal + Redis
├── package.json
├── tsconfig.json
└── README.md
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal server address |
| `BASE_URL` | `http://localhost:3000` | Base URL for internal supplier calls |
| `LOG_LEVEL` | `info` | Pino log level |
| `NODE_ENV` | — | Set to `production` for JSON logs |

---

## Stopping Services

```bash
docker-compose down          # Stop all services
docker-compose down -v       # Stop and remove volumes (Redis data)
```
