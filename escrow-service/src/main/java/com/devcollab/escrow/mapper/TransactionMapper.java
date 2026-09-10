package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.TransactionResponse;
import com.devcollab.escrow.entity.Transaction;
import org.mapstruct.*;

import java.util.List;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface TransactionMapper {

    @Mapping(target = "milestoneId", source = "milestone.id")
    TransactionResponse toResponse(Transaction transaction);

    List<TransactionResponse> toResponseList(List<Transaction> transactions);
}
