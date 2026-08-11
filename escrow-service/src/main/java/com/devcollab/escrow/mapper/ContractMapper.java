package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.entity.Contract;
import org.mapstruct.IterableMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
        uses = {MilestoneMapper.class}
)
public interface ContractMapper {

    @Named("fullResponse")
    @Mapping(target = "milestones", source = "milestones")
    ContractResponse toResponse(Contract contract);

    @Named("withoutMilestones")
    @Mapping(target = "milestones", ignore = true)
    ContractResponse toResponseWithoutMilestones(Contract contract);

    @IterableMapping(qualifiedByName = "fullResponse")
    List<ContractResponse> toResponseList(List<Contract> contracts);
}