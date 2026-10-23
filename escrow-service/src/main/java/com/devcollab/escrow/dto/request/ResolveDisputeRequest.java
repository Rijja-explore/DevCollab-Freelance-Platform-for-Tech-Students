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
public class ResolveDisputeRequest {

    @NotBlank(message = "Resolution is required (RELEASE, REFUND, REOPEN)")
    private String resolution;

    private String resolutionNotes;
}

