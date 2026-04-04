# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**USDT Transfer Monitor** — A real-time Ethereum blockchain transaction monitoring system. It polls Ethereum Mainnet RPC for USDT transfer events, persists them to MySQL, and streams them to a Next.js dashboard via WebSocket with tiered visual/sound effects for large ("whale") transactions.

## Running the Full Stack

```bash
cd usdt-monitor
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- MySQL: localhost:3306 (root/secret, database: usdt_monitor)

## Backend (Spring Boot / Maven)

```bash
cd usdt-monitor/backend
mvn spring-boot:run          # requires MySQL running
mvn clean package            # build JAR
mvn clean package -DskipTests
mvn test
```

## Frontend (Next.js / TypeScript)

```bash
cd usdt-monitor/frontend
npm install
npm run dev      # dev server on port 3000
npm run build
npm run lint     # ESLint via eslint-config-next
```

## Architecture

### Data Flow

1. **EthEventListener** (`@Scheduled` every 15s) — polls Ethereum blocks via Web3j, filters Transfer events from 4 USDT contract addresses, extracts tx metadata.
2. **TxService** — deduplicates by `txHash`, converts raw token units to 6-decimal USDT, persists to MySQL, broadcasts to WebSocket topic `/topic/transfers`.
3. **Frontend (`useTransferSocket`)** — STOMP over SockJS, auto-reconnects (5s), subscribes to `/topic/transfers`, prepends new rows to the transaction table.
4. **WhaleExplosion + SoundManager** — 4-tier Three.js animations and synthesized Web Audio sounds triggered by amount thresholds (≥5K, ≥10K, ≥50K, ≥100K USDT).

### Transaction Tiers

| Amount  | Tier       | Effect                        |
|---------|------------|-------------------------------|
| ≥100K   | LEGENDARY  | Massive explosion + orchestral |
| ≥50K    | MEGA WHALE | Vortex + rings + power-up     |
| ≥10K    | WHALE      | Center burst + whale alert    |
| ≥5K     | CASH RAIN  | Coin rain + happy melody      |
| <5K     | Regular    | Row flash only                |

### REST API

```
GET /api/transactions?page=0&size=20   # paginated history
```

### Key Backend Files

- `EthEventListener.java` — RPC polling scheduler, log parsing
- `TxService.java` — deduplication, unit conversion, WebSocket broadcast
- `TxController.java` — REST endpoint

### Key Frontend Files

- `src/app/page.tsx` — main dashboard, state management, REST + WebSocket wiring
- `src/components/WhaleExplosion.tsx` — Three.js tiered animations
- `src/lib/SoundManager.ts` — Web Audio API synthesized sounds (no external files)
- `src/hooks/useTransferSocket.ts` — STOMP WebSocket client with auto-reconnect
- `src/components/TxTable.tsx` — paginated table with tier-colored rows and Etherscan links

### Database (MySQL 8.0)

- `usdt_transactions` — persisted transfer events (`tx_hash` unique index)
- `sync_state` — single-row table storing last processed block number for safe resume

### Configuration

Backend `application.properties` key settings:
```
web3j.rpc-url=https://eth.drpc.org         # overridable via WEB3J_RPC_URL env var
ethereum.poll-delay-ms=15000
ethereum.block-lag=2                        # safety margin against reorgs
cors.allowed-origins=http://localhost:3000
```

Frontend environment variables:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
```
