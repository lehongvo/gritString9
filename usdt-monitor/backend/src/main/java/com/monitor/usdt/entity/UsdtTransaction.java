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
