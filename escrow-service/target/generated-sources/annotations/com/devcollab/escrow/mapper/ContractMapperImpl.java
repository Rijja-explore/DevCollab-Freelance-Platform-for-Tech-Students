package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.entity.Contract;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-08-12T13:31:29+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.12 (Oracle Corporation)"
)
@Component
public class ContractMapperImpl implements ContractMapper {

    @Autowired
    private MilestoneMapper milestoneMapper;

    @Override
    public ContractResponse toResponse(Contract contract) {
        if ( contract == null ) {
            return null;
        }

        ContractResponse.ContractResponseBuilder contractResponse = ContractResponse.builder();

        contractResponse.milestones( milestoneMapper.toResponseList( contract.getMilestones() ) );
        contractResponse.id( contract.getId() );
        contractResponse.projectId( contract.getProjectId() );
        contractResponse.startupId( contract.getStartupId() );
        contractResponse.studentId( contract.getStudentId() );
        contractResponse.title( contract.getTitle() );
        contractResponse.description( contract.getDescription() );
        contractResponse.totalAmount( contract.getTotalAmount() );
        contractResponse.currency( contract.getCurrency() );
        contractResponse.status( contract.getStatus() );
        contractResponse.terms( contract.getTerms() );
        contractResponse.createdAt( contract.getCreatedAt() );
        contractResponse.updatedAt( contract.getUpdatedAt() );

        return contractResponse.build();
    }

    @Override
    public ContractResponse toResponseWithoutMilestones(Contract contract) {
        if ( contract == null ) {
            return null;
        }

        ContractResponse.ContractResponseBuilder contractResponse = ContractResponse.builder();

        contractResponse.id( contract.getId() );
        contractResponse.projectId( contract.getProjectId() );
        contractResponse.startupId( contract.getStartupId() );
        contractResponse.studentId( contract.getStudentId() );
        contractResponse.title( contract.getTitle() );
        contractResponse.description( contract.getDescription() );
        contractResponse.totalAmount( contract.getTotalAmount() );
        contractResponse.currency( contract.getCurrency() );
        contractResponse.status( contract.getStatus() );
        contractResponse.terms( contract.getTerms() );
        contractResponse.createdAt( contract.getCreatedAt() );
        contractResponse.updatedAt( contract.getUpdatedAt() );

        return contractResponse.build();
    }

    @Override
    public List<ContractResponse> toResponseList(List<Contract> contracts) {
        if ( contracts == null ) {
            return null;
        }

        List<ContractResponse> list = new ArrayList<ContractResponse>( contracts.size() );
        for ( Contract contract : contracts ) {
            list.add( toResponse( contract ) );
        }

        return list;
    }
}
