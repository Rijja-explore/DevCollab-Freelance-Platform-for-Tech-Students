package com.devcollab.escrow.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class CreateContractRequest {

    @NotNull(message = "projectId is required")
    private UUID projectId;

    private UUID startupId;

    private UUID studentId;

    @Size(max = 255, message = "title must not exceed 255 characters")
    private String title;

    @Size(max = 5000, message = "description must not exceed 5000 characters")
    private String description;

    @DecimalMin(value = "0.00", message = "totalAmount must be non-negative")
    @Digits(integer = 15, fraction = 4, message = "Invalid totalAmount format")
    private BigDecimal totalAmount;

    @Pattern(regexp = "^[A-Z]{3}$", message = "currency must be a valid 3-letter ISO code")
    private String currency = "INR";

    @Size(max = 10000, message = "terms must not exceed 10000 characters")
    private String terms;

    @Valid
    private List<MilestoneDefinition> milestones;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class MilestoneDefinition {

        @Size(max = 255)
        private String title;

        @Size(max = 2000)
        private String description;

        @DecimalMin(value = "0.00")
        private BigDecimal amount;

        @Min(value = 1)
        private Integer sequenceOrder;

        private LocalDate dueDate;
    }
}

