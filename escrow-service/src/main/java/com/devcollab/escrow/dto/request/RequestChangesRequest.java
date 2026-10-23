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
public class RequestChangesRequest {

    @NotBlank(message = "Review feedback is required when requesting changes")
    private String reviewFeedback;
}

