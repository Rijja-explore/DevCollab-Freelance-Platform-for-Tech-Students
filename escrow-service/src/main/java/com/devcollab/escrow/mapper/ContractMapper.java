package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.entity.Contract;
import org.mapstruct.*;

import java.util.List;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
        uses = {MilestoneMapper.class}
)
public interface ContractMapper {

    @Mapping(target = "milestones", source = "milestones")
    ContractResponse toResponse(Contract contract);

    @Mapping(target = "milestones", ignore = true)
    ContractResponse toResponseWithoutMilestones(Contract contract);

    List<ContractResponse> toResponseList(List<Contract> contracts);
}
