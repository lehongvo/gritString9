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
                          BigInteger valueRaw, Long blockNumber, Long blockTimestampSec,
                          String tokenName) {

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
                .tokenName(tokenName)
                .blockNumber(blockNumber)
                .blockTimestamp(blockTime)
                .build();

        repository.save(tx);
        log.info("Saved tx: {} | {} {} | block {}", txHash, valueUsdt, tokenName, blockNumber);

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
