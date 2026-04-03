# Task: Build USDT Transfer Monitor — Full Stack (Java + Next.js + MySQL + Docker)

## Mục tiêu
Xây dựng hệ thống monitor giao dịch transfer USDT trên Ethereum Mainnet theo thời gian thực.
- Backend poll RPC lấy logs Transfer của USDT, lưu vào MySQL
- Mỗi lần phát hiện tx mới → notify FE qua WebSocket
- FE call REST API lấy lịch sử từ DB, hiển thị realtime

---

## Stack
- **Backend**: Java 17 + Spring Boot 3.x (Spring Web, Spring WebSocket, Spring Data JPA, Web3j)
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Database**: MySQL 8
- **Deploy**: Docker + Docker Compose (local)
- **RPC Endpoint**: https://eth.drpc.org

---

## Thông tin on-chain
- **USDT Contract**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **Event signature**: `Transfer(address indexed from, address indexed to, uint256 value)`
- **Event topic0**: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`
- **Chain**: Ethereum Mainnet (chainId: 1)

---

## Cấu trúc project