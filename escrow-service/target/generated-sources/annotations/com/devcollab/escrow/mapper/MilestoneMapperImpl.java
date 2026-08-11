package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.MilestoneResponse;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-08-11T23:47:19+0530",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.100.v20260624-0231, environment: Java 21.0.11 (Eclipse Adoptium)"
)
@Component
public class MilestoneMapperImpl implements MilestoneMapper {

    @Override
    public MilestoneResponse toResponse(Milestone milestone) {
        if ( milestone == null ) {
            return null;
        }

        MilestoneResponse.MilestoneResponseBuilder milestoneResponse = MilestoneResponse.builder();

        milestoneResponse.contractId( milestoneContractId( milestone ) );
        milestoneResponse.amount( milestone.getAmount() );
        milestoneResponse.approvedAt( milestone.getApprovedAt() );
        milestoneResponse.approvedBy( milestone.getApprovedBy() );
        milestoneResponse.createdAt( milestone.getCreatedAt() );
        milestoneResponse.description( milestone.getDescription() );
        milestoneResponse.dueDate( milestone.getDueDate() );
        milestoneResponse.id( milestone.getId() );
        milestoneResponse.idempotencyKey( milestone.getIdempotencyKey() );
        milestoneResponse.releasedAt( milestone.getReleasedAt() );
        milestoneResponse.sequenceOrder( milestone.getSequenceOrder() );
        milestoneResponse.status( milestone.getStatus() );
        milestoneResponse.title( milestone.getTitle() );
        milestoneResponse.updatedAt( milestone.getUpdatedAt() );

        return milestoneResponse.build();
    }

    @Override
    public List<MilestoneResponse> toResponseList(List<Milestone> milestones) {
        if ( milestones == null ) {
            return null;
        }

        List<MilestoneResponse> list = new ArrayList<MilestoneResponse>( milestones.size() );
        for ( Milestone milestone : milestones ) {
            list.add( toResponse( milestone ) );
        }

        return list;
    }

    private UUID milestoneContractId(Milestone milestone) {
        if ( milestone == null ) {
            return null;
        }
        Contract contract = milestone.getContract();
        if ( contract == null ) {
            return null;
        }
        UUID id = contract.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }
}
