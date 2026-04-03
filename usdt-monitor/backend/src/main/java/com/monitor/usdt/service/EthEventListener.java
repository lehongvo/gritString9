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
        Long saved = txService.getLastSyncedBlock();
        if (saved > 0) {
            lastProcessedBlock.set(saved);
            log.info("Resuming from block {}", saved);
        }
    }

    @Scheduled(fixedDelayString = "${ethereum.poll-delay-ms:5000}")
    public void pollTransferEvents() {
        try {
            var ethBlockNum = web3j.ethBlockNumber().send();
            if (ethBlockNum.hasError()) {
                log.warn("ethBlockNumber error: {}", ethBlockNum.getError().getMessage());
                return;
            }
            BigInteger latestBlock = ethBlockNum.getBlockNumber();
            long safeBlock = latestBlock.longValue() - blockLag;

            long fromBlock = lastProcessedBlock.get() == 0
                    ? safeBlock - 10
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
            if (ethLog.hasError()) {
                log.warn("RPC error: {}", ethLog.getError().getMessage());
                return;
            }
            List<EthLog.LogResult> logs = ethLog.getLogs();
            if (logs == null) {
                log.warn("getLogs returned null for blocks {} → {}", fromBlock, safeBlock);
                return;
            }

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

    private void processLog(Log ethLog) {
        try {
            List<String> topics = ethLog.getTopics();
            if (topics.size() < 3) return;

            String from = "0x" + topics.get(1).substring(26);
            String to   = "0x" + topics.get(2).substring(26);

            BigInteger value = new BigInteger(ethLog.getData().substring(2), 16);

            Long blockNumber = ethLog.getBlockNumber().longValue();
            Long blockTimestamp = getBlockTimestamp(blockNumber);

            txService.saveIfNew(
                    ethLog.getTransactionHash(),
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
