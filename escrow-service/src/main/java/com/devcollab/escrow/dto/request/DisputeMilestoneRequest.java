package com.devcollab.escrow.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisputeMilestoneRequest {

    @NotBlank(message = "Dispute reason is required")
    private String reason;
}

