package com.devcollab.escrow.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitMilestoneRequest {
    private String deliverableUrl;
    private String submissionNotes;
}

