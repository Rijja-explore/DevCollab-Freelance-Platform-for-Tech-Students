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
public class ProjectSearchCriteria {
    private String keyword;
    private String category;
    private String status;
    private List<String> skills;
    private Boolean allSkills;
    private BigDecimal minBudget;
    private BigDecimal maxBudget;
    private String currency;
    private String startupId;

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDirection = "desc";
}

