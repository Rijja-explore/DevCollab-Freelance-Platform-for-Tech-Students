package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.MilestoneResponse;
import com.devcollab.escrow.entity.Milestone;
import org.mapstruct.*;

import java.util.List;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface MilestoneMapper {

    @Mapping(target = "contractId", source = "contract.id")
    MilestoneResponse toResponse(Milestone milestone);

    List<MilestoneResponse> toResponseList(List<Milestone> milestones);
}
