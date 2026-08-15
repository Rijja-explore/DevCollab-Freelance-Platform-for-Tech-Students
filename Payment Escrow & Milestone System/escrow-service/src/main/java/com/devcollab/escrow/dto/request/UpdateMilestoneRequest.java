package com.devcollab.escrow.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class UpdateMilestoneRequest {

    @Size(min = 3, max = 255)
    private String title;

    @Size(max = 2000)
    private String description;

    @Future
    private LocalDate dueDate;
}
