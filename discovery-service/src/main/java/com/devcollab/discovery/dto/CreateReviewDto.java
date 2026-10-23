package com.devcollab.discovery.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewDto {

    @NotBlank(message = "Reviewer ID is required")
    @Size(max = 36, message = "Reviewer ID must be at most 36 characters")
    private String reviewerId;

    @NotBlank(message = "Reviewer name is required")
    @Size(max = 255, message = "Reviewer name must be at most 255 characters")
    private String reviewerName;

    @Size(max = 36, message = "Project ID must be at most 36 characters")
    private String projectId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;

    @Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @Size(max = 5000, message = "Comment must be at most 5000 characters")
    private String comment;
}

