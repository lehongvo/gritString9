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
