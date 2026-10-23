package com.devcollab.discovery.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Partial profile update: only non-null fields are applied. (Binding to the entity
 * instead would fill omitted fields with the entity's builder defaults and overwrite
 * the stored hourly rate / availability.) Rating and review count are derived from
 * reviews and intentionally not updatable.
 */
@Data
@NoArgsConstructor
public class UpdateStudentProfileDto {
    @Size(max = 255)
    private String fullName;
    @Size(max = 255)
    private String headline;
    @Size(max = 5000)
    private String bio;
    @DecimalMin(value = "0.00", message = "hourlyRate must be non-negative")
    private BigDecimal hourlyRate;
    private Set<String> skills;
    @Size(max = 255)
    private String location;
    private String availability;
}
