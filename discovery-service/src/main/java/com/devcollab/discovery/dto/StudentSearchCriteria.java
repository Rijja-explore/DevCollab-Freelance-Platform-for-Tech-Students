package com.devcollab.discovery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSearchCriteria {
    private String keyword;
    private List<String> skills;
    private Boolean allSkills;
    private Double minRating;
    private Double maxRating;
    private BigDecimal minHourlyRate;
    private BigDecimal maxHourlyRate;
    /** Case-insensitive substring match on the profile location (e.g. "Bangalore", "Remote"). */
    private String location;
    /** AVAILABLE, PART_TIME or UNAVAILABLE; may contain several values. */
    private List<String> availability;

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;

    @Builder.Default
    private String sortBy = "rating";

    @Builder.Default
    private String sortDirection = "desc";
}
