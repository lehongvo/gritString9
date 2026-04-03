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
