package com.devcollab.escrow.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class CreateMilestoneRequest {

    @NotNull(message = "contractId is required")
    private UUID contractId;

    @NotBlank(message = "title is required")
    @Size(min = 3, max = 255, message = "title must be between 3 and 255 characters")
    private String title;

    @Size(max = 2000)
    private String description;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be positive")
    @Digits(integer = 15, fraction = 4)
    private BigDecimal amount;

    @NotNull(message = "sequenceOrder is required")
    @Min(value = 1, message = "sequenceOrder must be at least 1")
    private Integer sequenceOrder;

    @Future(message = "dueDate must be in the future")
    private LocalDate dueDate;
}
