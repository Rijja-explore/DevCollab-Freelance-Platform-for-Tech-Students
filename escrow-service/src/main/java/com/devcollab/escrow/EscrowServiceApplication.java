package com.devcollab.escrow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableAsync
@EnableTransactionManagement
public class EscrowServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EscrowServiceApplication.class, args);
    }
}
