---
name: usdt-transfer-monitor
description: >
  Dùng skill này để build hệ thống monitor giao dịch Transfer USDT trên Ethereum Mainnet
  theo thời gian thực. Kích hoạt khi người dùng yêu cầu: "build USDT monitor", "theo dõi
  giao dịch USDT", "realtime tx Ethereum", "WebSocket Spring Boot blockchain", hoặc bất kỳ
  yêu cầu nào liên quan đến việc xây dựng hệ thống poll Ethereum RPC + lưu DB + notify FE
  qua WebSocket. Stack: Java Spring Boot + Next.js + MySQL + Docker Compose.
  Skill này bao gồm toàn bộ workflow từ khởi tạo project, viết code, cấu hình Docker,
  đến kiểm tra acceptance criteria. Không bỏ qua bất kỳ bước nào.
---

# USDT Transfer Monitor — Full Stack Build Skill

Hệ thống monitor giao dịch Transfer USDT trên Ethereum Mainnet theo thời gian thực.
Backend Java poll RPC → lưu MySQL → push WebSocket → FE Next.js hiển thị realtime.

---

## Thông tin hệ thống (cố định, không thay đổi)

```
RPC Endpoint  : https://eth.llamarpc.com
USDT Contract : 0xdAC17F958D2ee523a2206206994597C13D831ec7
Transfer topic: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
USDT decimals : 6
Chain ID      : 1 (Ethereum Mainnet)

Backend port  : 8080
Frontend port : 3000
MySQL port    : 3306
DB name       : usdt_monitor
DB user       : root / secret
```

---

## Cấu trúc thư mục (tạo đúng theo cấu trúc này)

```
usdt-monitor/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       └── main/
│           ├── java/com/monitor/usdt/
│           │   ├── UsdtMonitorApplication.java
│           │   ├── config/
│           │   │   ├── Web3jConfig.java
│           │   │   └── WebSocketConfig.java
│           │   ├── entity/
│           │   │   └── UsdtTransaction.java
│           │   ├── repository/
│           │   │   └── UsdtTransactionRepository.java
│           │   ├── service/
│           │   │   ├── EthEventListener.java
│           │   │   └── TxService.java
│           │   ├── controller/
│           │   │   └── TxController.java
│           │   └── dto/
│           │       └── TxDTO.java
│           └── resources/
│               └── application.properties
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── .env.local
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   └── page.tsx
        ├── components/
        │   ├── TxTable.tsx
        │   └── LiveBadge.tsx
        └── hooks/
            └── useTransferSocket.ts
```

---

## Workflow — Thực hiện theo đúng thứ tự này

### Bước 1 — Tạo Docker Compose và khởi động DB trước

Tạo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: usdt-mysql
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: usdt_monitor
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/src/main/resources/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-psecret"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - usdt-net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: usdt-backend
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/usdt_monitor?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: secret
      WEB3J_RPC_URL: https://eth.llamarpc.com
    networks:
      - usdt-net
    restart: on-failure

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: usdt-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
      NEXT_PUBLIC_WS_URL: http://localhost:8080/ws
    networks:
      - usdt-net

networks:
  usdt-net:
    driver: bridge

volumes:
  mysql_data:
```

---

### Bước 2 — Database Schema

Tạo `backend/src/main/resources/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS usdt_transactions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tx_hash         VARCHAR(66)    NOT NULL,
  from_address    VARCHAR(42)    NOT NULL,
  to_address      VARCHAR(42)    NOT NULL,
  value_raw       VARCHAR(78)    NOT NULL,
  value_usdt      DECIMAL(28, 6) NOT NULL,
  block_number    BIGINT         NOT NULL,
  block_timestamp DATETIME       NOT NULL,
  created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tx_hash (tx_hash),
  INDEX idx_block_number (block_number),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sync_state (
  id              INT            PRIMARY KEY DEFAULT 1,
  last_block      BIGINT         NOT NULL DEFAULT 0,
  updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO sync_state (id, last_block) VALUES (1, 0);
```

---

### Bước 3 — Backend: pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
    <relativePath/>
  </parent>

  <groupId>com.monitor</groupId>
  <artifactId>usdt-monitor</artifactId>
  <version>1.0.0</version>
  <name>usdt-monitor</name>

  <properties>
    <java.version>17</java.version>
    <web3j.version>4.10.3</web3j.version>
  </properties>

  <dependencies>
    <!-- Spring Web -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring WebSocket + STOMP -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>

    <!-- Spring Data JPA -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- MySQL Driver -->
    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <scope>runtime</scope>
    </dependency>

    <!-- Web3j Core -->
    <dependency>
      <groupId>org.web3j</groupId>
      <artifactId>core</artifactId>
      <version>${web3j.version}</version>
    </dependency>

    <!-- Lombok -->
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>

    <!-- Test -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

### Bước 4 — Backend: application.properties

```properties
server.port=8080

# Datasource
spring.datasource.url=jdbc:mysql://localhost:3306/usdt_monitor?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=secret
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# SQL init
spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql

# Scheduling
spring.task.scheduling.pool.size=2

# Web3j
web3j.rpc-url=${WEB3J_RPC_URL:https://eth.llamarpc.com}

# Ethereum config
ethereum.usdt-contract=0xdAC17F958D2ee523a2206206994597C13D831ec7
ethereum.transfer-topic=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
ethereum.poll-delay-ms=5000
ethereum.block-lag=2

# CORS
cors.allowed-origins=http://localhost:3000
```

---

### Bước 5 — Backend: Toàn bộ Java source

#### UsdtMonitorApplication.java
```java
package com.monitor.usdt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class UsdtMonitorApplication {
    public static void main(String[] args) {
        SpringApplication.run(UsdtMonitorApplication.class, args);
    }
}
```

#### config/Web3jConfig.java
```java
package com.monitor.usdt.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

@Configuration
public class Web3jConfig {

    @Value("${web3j.rpc-url}")
    private String rpcUrl;

    @Bean
    public Web3j web3j() {
        return Web3j.build(new HttpService(rpcUrl));
    }
}
```

#### config/WebSocketConfig.java
```java
package com.monitor.usdt.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins)
                .withSockJS();
    }
}
```

#### config/CorsConfig.java
```java
package com.monitor.usdt.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

#### entity/UsdtTransaction.java
```java
package com.monitor.usdt.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "usdt_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsdtTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_hash", nullable = false, unique = true, length = 66)
    private String txHash;

    @Column(name = "from_address", nullable = false, length = 42)
    private String fromAddress;

    @Column(name = "to_address", nullable = false, length = 42)
    private String toAddress;

    @Column(name = "value_raw", nullable = false, length = 78)
    private String valueRaw;

    @Column(name = "value_usdt", nullable = false, precision = 28, scale = 6)
    private BigDecimal valueUsdt;

    @Column(name = "block_number", nullable = false)
    private Long blockNumber;

    @Column(name = "block_timestamp", nullable = false)
    private LocalDateTime blockTimestamp;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
```

#### dto/TxDTO.java
```java
package com.monitor.usdt.dto;

import com.monitor.usdt.entity.UsdtTransaction;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TxDTO {
    private Long id;
    private String txHash;
    private String fromAddress;
    private String toAddress;
    private BigDecimal valueUsdt;
    private Long blockNumber;
    private LocalDateTime blockTimestamp;
    private LocalDateTime createdAt;

    public static TxDTO from(UsdtTransaction tx) {
        return TxDTO.builder()
                .id(tx.getId())
                .txHash(tx.getTxHash())
                .fromAddress(tx.getFromAddress())
                .toAddress(tx.getToAddress())
                .valueUsdt(tx.getValueUsdt())
                .blockNumber(tx.getBlockNumber())
                .blockTimestamp(tx.getBlockTimestamp())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
```

#### repository/UsdtTransactionRepository.java
```java
package com.monitor.usdt.repository;

import com.monitor.usdt.entity.UsdtTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UsdtTransactionRepository extends JpaRepository<UsdtTransaction, Long> {
    boolean existsByTxHash(String txHash);

    @Query("SELECT MAX(t.blockNumber) FROM UsdtTransaction t")
    Long findMaxBlockNumber();
}
```

#### service/TxService.java
```java
package com.monitor.usdt.service;

import com.monitor.usdt.dto.TxDTO;
import com.monitor.usdt.entity.UsdtTransaction;
import com.monitor.usdt.repository.UsdtTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
@Slf4j
public class TxService {

    private static final BigDecimal USDT_DIVISOR = BigDecimal.TEN.pow(6);

    private final UsdtTransactionRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void saveIfNew(String txHash, String from, String to,
                          BigInteger valueRaw, Long blockNumber, Long blockTimestampSec) {

        if (repository.existsByTxHash(txHash)) {
            log.debug("Tx already exists: {}", txHash);
            return;
        }

        BigDecimal valueUsdt = new BigDecimal(valueRaw).divide(USDT_DIVISOR);
        LocalDateTime blockTime = LocalDateTime.ofInstant(
                Instant.ofEpochSecond(blockTimestampSec), ZoneOffset.UTC);

        UsdtTransaction tx = UsdtTransaction.builder()
                .txHash(txHash)
                .fromAddress(from)
                .toAddress(to)
                .valueRaw(valueRaw.toString())
                .valueUsdt(valueUsdt)
                .blockNumber(blockNumber)
                .blockTimestamp(blockTime)
                .build();

        repository.save(tx);
        log.info("Saved tx: {} | {} USDT | block {}", txHash, valueUsdt, blockNumber);

        // Push WebSocket notification
        TxDTO dto = TxDTO.from(tx);
        messagingTemplate.convertAndSend("/topic/transfers", dto);
    }

    @Transactional(readOnly = true)
    public Page<TxDTO> getTransactions(Pageable pageable) {
        return repository.findAll(pageable).map(TxDTO::from);
    }

    @Transactional(readOnly = true)
    public Long getLastSyncedBlock() {
        Long max = repository.findMaxBlockNumber();
        return max != null ? max : 0L;
    }
}
```

#### service/EthEventListener.java
```java
package com.monitor.usdt.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
public class EthEventListener {

    private final Web3j web3j;
    private final TxService txService;

    @Value("${ethereum.usdt-contract}")
    private String usdtContract;

    @Value("${ethereum.transfer-topic}")
    private String transferTopic;

    @Value("${ethereum.block-lag:2}")
    private int blockLag;

    private final AtomicLong lastProcessedBlock = new AtomicLong(0);

    @PostConstruct
    public void init() {
        // Resume from last saved block in DB
        Long saved = txService.getLastSyncedBlock();
        if (saved > 0) {
            lastProcessedBlock.set(saved);
            log.info("Resuming from block {}", saved);
        }
    }

    @Scheduled(fixedDelayString = "${ethereum.poll-delay-ms:5000}")
    public void pollTransferEvents() {
        try {
            BigInteger latestBlock = web3j.ethBlockNumber().send().getBlockNumber();
            long safeBlock = latestBlock.longValue() - blockLag;

            long fromBlock = lastProcessedBlock.get() == 0
                    ? safeBlock - 10   // first run: last 10 blocks
                    : lastProcessedBlock.get() + 1;

            if (fromBlock > safeBlock) {
                log.debug("No new blocks. fromBlock={} safeBlock={}", fromBlock, safeBlock);
                return;
            }

            log.info("Polling blocks {} → {}", fromBlock, safeBlock);

            EthFilter filter = new EthFilter(
                    DefaultBlockParameter.valueOf(BigInteger.valueOf(fromBlock)),
                    DefaultBlockParameter.valueOf(BigInteger.valueOf(safeBlock)),
                    usdtContract
            );
            filter.addSingleTopic(transferTopic);

            EthLog ethLog = web3j.ethGetLogs(filter).send();
            List<EthLog.LogResult> logs = ethLog.getLogs();

            log.info("Found {} Transfer events", logs.size());

            for (EthLog.LogResult logResult : logs) {
                if (logResult instanceof EthLog.LogObject logObject) {
                    processLog(logObject.get());
                }
            }

            lastProcessedBlock.set(safeBlock);

        } catch (Exception e) {
            log.error("Error polling ETH events: {}", e.getMessage(), e);
        }
    }

    private void processLog(Log log) {
        try {
            List<String> topics = log.getTopics();
            if (topics.size() < 3) return;

            // Decode indexed params from topics
            String from = "0x" + topics.get(1).substring(26);  // remove 0x + 12 bytes padding
            String to   = "0x" + topics.get(2).substring(26);

            // Decode non-indexed value from data
            BigInteger value = new BigInteger(log.getData().substring(2), 16);

            // Get block timestamp
            Long blockNumber = log.getBlockNumber().longValue();
            Long blockTimestamp = getBlockTimestamp(blockNumber);

            txService.saveIfNew(
                    log.getTransactionHash(),
                    from.toLowerCase(),
                    to.toLowerCase(),
                    value,
                    blockNumber,
                    blockTimestamp
            );

        } catch (Exception e) {
            log.error("Error processing log: {}", e.getMessage());
        }
    }

    private Long getBlockTimestamp(Long blockNumber) {
        try {
            return web3j.ethGetBlockByNumber(
                    DefaultBlockParameter.valueOf(BigInteger.valueOf(blockNumber)), false)
                    .send()
                    .getBlock()
                    .getTimestamp()
                    .longValue();
        } catch (Exception e) {
            log.warn("Cannot get block timestamp for block {}: {}", blockNumber, e.getMessage());
            return System.currentTimeMillis() / 1000;
        }
    }
}
```

#### controller/TxController.java
```java
package com.monitor.usdt.controller;

import com.monitor.usdt.dto.TxDTO;
import com.monitor.usdt.service.TxService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TxController {

    private final TxService txService;

    @GetMapping
    public ResponseEntity<Page<TxDTO>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("blockNumber").descending());
        return ResponseEntity.ok(txService.getTransactions(pageable));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
```

---

### Bước 6 — Backend: Dockerfile

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

---

### Bước 7 — Frontend: package.json

```json
{
  "name": "usdt-monitor-fe",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@stomp/stompjs": "^7.0.0",
    "sockjs-client": "^1.6.1",
    "date-fns": "^3.3.1"
  },
  "devDependencies": {
    "@types/node": "20.11.5",
    "@types/react": "18.2.48",
    "@types/react-dom": "18.2.18",
    "@types/sockjs-client": "^1.5.4",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.1",
    "autoprefixer": "10.4.17",
    "postcss": "8.4.33",
    "eslint": "8.56.0",
    "eslint-config-next": "14.1.0"
  }
}
```

#### next.config.js
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
```

#### .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
```

---

### Bước 8 — Frontend: Toàn bộ TypeScript/React source

#### hooks/useTransferSocket.ts
```typescript
import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export type TxDTO = {
  id: number
  txHash: string
  fromAddress: string
  toAddress: string
  valueUsdt: number
  blockNumber: number
  blockTimestamp: string
  createdAt: string
}

type UseTransferSocketReturn = {
  connected: boolean
  latestTx: TxDTO | null
}

export function useTransferSocket(
  onNewTx: (tx: TxDTO) => void
): UseTransferSocketReturn {
  const [connected, setConnected] = useState(false)
  const [latestTx, setLatestTx] = useState<TxDTO | null>(null)
  const clientRef = useRef<Client | null>(null)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws'

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/transfers', (message) => {
          try {
            const tx: TxDTO = JSON.parse(message.body)
            setLatestTx(tx)
            onNewTx(tx)
          } catch (e) {
            console.error('Parse WS message error', e)
          }
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error('STOMP error', frame)
        setConnected(false)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, latestTx }
}
```

#### components/LiveBadge.tsx
```typescript
type Props = { connected: boolean }

export function LiveBadge({ connected }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        connected
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      {connected ? 'LIVE' : 'Connecting...'}
    </span>
  )
}
```

#### components/TxTable.tsx
```typescript
import { format } from 'date-fns'
import { TxDTO } from '@/hooks/useTransferSocket'

type Props = {
  transactions: TxDTO[]
  isLoading: boolean
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

export function TxTable({ transactions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading transactions...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        No transactions yet. Waiting for USDT transfers...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Tx Hash', 'From', 'To', 'Amount (USDT)', 'Block', 'Time'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {transactions.map((tx) => (
            <tr key={tx.txHash} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-sm">
                <a
                  href={`https://etherscan.io/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {shortHash(tx.txHash)}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">
                <a
                  href={`https://etherscan.io/address/${tx.fromAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shortAddr(tx.fromAddress)}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">
                <a
                  href={`https://etherscan.io/address/${tx.toAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shortAddr(tx.toAddress)}
                </a>
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                {Number(tx.valueUsdt).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="font-normal text-gray-500 text-xs">USDT</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                #{tx.blockNumber.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {format(new Date(tx.blockTimestamp), 'dd/MM/yyyy HH:mm:ss')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

#### app/layout.tsx
```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'USDT Transfer Monitor',
  description: 'Realtime USDT transfer tracker on Ethereum Mainnet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
```

#### app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### app/page.tsx
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { TxTable } from '@/components/TxTable'
import { LiveBadge } from '@/components/LiveBadge'
import { useTransferSocket, TxDTO } from '@/hooks/useTransferSocket'

const PAGE_SIZE = 20
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function HomePage() {
  const [transactions, setTransactions] = useState<TxDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [newTxCount, setNewTxCount] = useState(0)

  const fetchTransactions = useCallback(async (p = 0) => {
    try {
      const res = await fetch(
        `${API_URL}/api/transactions?page=${p}&size=${PAGE_SIZE}`
      )
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setTransactions(data.content)
      setTotalPages(data.totalPages)
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions(0)
  }, [fetchTransactions])

  const handleNewTx = useCallback((tx: TxDTO) => {
    if (page === 0) {
      setTransactions((prev) => {
        // Prepend if not duplicate
        if (prev.find((t) => t.txHash === tx.txHash)) return prev
        return [tx, ...prev].slice(0, PAGE_SIZE)
      })
    }
    setNewTxCount((n) => n + 1)
  }, [page])

  const { connected } = useTransferSocket(handleNewTx)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">USDT Transfer Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ethereum Mainnet · Contract{' '}
            <a
              href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:underline"
            >
              0xdAC17F...31ec7
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {newTxCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              +{newTxCount} new
            </span>
          )}
          <LiveBadge connected={connected} />
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <TxTable transactions={transactions} isLoading={isLoading} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => { setPage(p => p - 1); fetchTransactions(page - 1) }}
            disabled={page === 0}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(p => p + 1); fetchTransactions(page + 1) }}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
```

#### tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
```

---

### Bước 9 — Frontend: Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

---

### Bước 10 — Chạy và kiểm tra

#### Khởi động toàn bộ stack
```bash
cd usdt-monitor
docker compose up --build -d

# Xem logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
```

#### Kiểm tra từng service
```bash
# Backend health
curl http://localhost:8080/api/transactions/health

# API lấy transactions
curl "http://localhost:8080/api/transactions?page=0&size=5" | jq .

# MySQL: kiểm tra data
docker exec -it usdt-mysql mysql -uroot -psecret usdt_monitor \
  -e "SELECT id, tx_hash, value_usdt, block_number FROM usdt_transactions LIMIT 5;"

# Frontend
open http://localhost:3000
```

#### Restart riêng backend (khi sửa code)
```bash
docker compose build backend && docker compose up -d backend
```

---

## Acceptance Checklist — KHÔNG được đánh dấu done nếu chưa pass hết

```
INFRASTRUCTURE
[ ] docker compose up --build chạy không lỗi
[ ] MySQL healthy trước khi backend khởi động
[ ] Schema tạo tự động (usdt_transactions + sync_state)
[ ] 3 container cùng chạy: usdt-mysql, usdt-backend, usdt-frontend

BACKEND
[ ] /api/transactions/health trả về 200 OK
[ ] EthEventListener log "Polling blocks X → Y" mỗi 5 giây
[ ] Khi có USDT Transfer trên Ethereum → log "Saved tx: 0x..."
[ ] Không duplicate tx_hash trong DB (UNIQUE constraint hoạt động)
[ ] GET /api/transactions trả về JSON đúng format {content, totalElements, totalPages}
[ ] valueUsdt = valueRaw / 10^6 chính xác
[ ] blockTimestamp là UTC datetime đúng
[ ] WebSocket endpoint /ws accessible

FRONTEND
[ ] http://localhost:3000 load được, không lỗi console
[ ] LiveBadge hiển thị "● LIVE" màu xanh khi connect WS thành công
[ ] Bảng transactions hiển thị dữ liệu từ API
[ ] USDT amount format: số thập phân 2 chữ số, có dấu phẩy ngàn
[ ] Tx hash và address là link đến Etherscan
[ ] Khi có tx mới → row xuất hiện trên đầu bảng KHÔNG cần refresh
[ ] Badge "+N new" tăng đếm khi có tx mới qua WebSocket
[ ] Pagination hoạt động (Previous/Next)

REALTIME FLOW
[ ] Tx xuất hiện trên FE trong vòng <10 giây sau khi on-chain
[ ] Nhiều client mở cùng lúc đều nhận được WS event
[ ] Backend restart → FE tự reconnect (SockJS reconnect)
[ ] Không memory leak sau 30 phút chạy liên tục
```

---

## Lỗi thường gặp và cách xử lý

### Backend không connect được MySQL
```
Nguyên nhân: backend khởi động trước khi MySQL ready
Fix: đảm bảo healthcheck trong docker-compose đúng, depends_on có condition: service_healthy
```

### Web3j timeout hoặc connection refused
```
Nguyên nhân: RPC rate limit hoặc network issue trong Docker
Fix: thêm retry logic trong EthEventListener, tăng poll-delay-ms lên 10000
```

### CORS error từ FE
```
Nguyên nhân: CorsConfig không match domain FE
Fix: kiểm tra cors.allowed-origins trong application.properties = http://localhost:3000
```

### WebSocket không connect
```
Nguyên nhân: SockJS cần HTTP endpoint, không phải ws://
Fix: NEXT_PUBLIC_WS_URL phải là http://localhost:8080/ws (không phải ws://)
```

### Topics decode sai (địa chỉ bị thêm ký tự)
```
Nguyên nhân: topics là 32-byte padded, cần slice 26 ký tự (0x + 12 bytes padding = 26 hex chars)
Fix: "0x" + topics.get(1).substring(26) → đúng
     "0x" + topics.get(1).substring(2)  → sai (giữ padding)
```

### next build fail "standalone output"
```
Nguyên nhân: next.config.js thiếu output: 'standalone'
Fix: thêm output: 'standalone' vào next.config.js
```

---

## Quy tắc agent phải tuân theo

- **Không skip bước nào** — thực hiện tuần tự từ Bước 1 đến Bước 10
- **Tạo đủ file theo cấu trúc thư mục** — không gộp hay bỏ sót file
- **Không thay đổi port** — backend:8080, frontend:3000, mysql:3306
- **Không thay đổi contract address hoặc transfer topic** — các giá trị này cố định
- **Kiểm tra acceptance checklist** trước khi báo done
- **Nếu một bước fail** → debug, fix, thử lại. Không nhảy sang bước khác khi chưa pass
- **Log phải readable** — không tắt log của EthEventListener trong production
- **USDT decimal là 6** — không nhầm với ETH (18) hay các token khác