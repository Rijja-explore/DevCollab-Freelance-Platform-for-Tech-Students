package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.TransactionResponse;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.Transaction;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-08-08T10:55:03+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.12 (Oracle Corporation)"
)
@Component
public class TransactionMapperImpl implements TransactionMapper {

    @Override
    public TransactionResponse toResponse(Transaction transaction) {
        if ( transaction == null ) {
            return null;
        }

        TransactionResponse.TransactionResponseBuilder transactionResponse = TransactionResponse.builder();

        transactionResponse.milestoneId( transactionMilestoneId( transaction ) );
        transactionResponse.id( transaction.getId() );
        transactionResponse.providerTransactionId( transaction.getProviderTransactionId() );
        transactionResponse.providerOrderId( transaction.getProviderOrderId() );
        transactionResponse.providerPaymentId( transaction.getProviderPaymentId() );
        transactionResponse.amount( transaction.getAmount() );
        transactionResponse.currency( transaction.getCurrency() );
        transactionResponse.status( transaction.getStatus() );
        transactionResponse.provider( transaction.getProvider() );
        transactionResponse.failureReason( transaction.getFailureReason() );
        transactionResponse.createdAt( transaction.getCreatedAt() );
        transactionResponse.completedAt( transaction.getCompletedAt() );

        return transactionResponse.build();
    }

    @Override
    public List<TransactionResponse> toResponseList(List<Transaction> transactions) {
        if ( transactions == null ) {
            return null;
        }

        List<TransactionResponse> list = new ArrayList<TransactionResponse>( transactions.size() );
        for ( Transaction transaction : transactions ) {
            list.add( toResponse( transaction ) );
        }

        return list;
    }

    private UUID transactionMilestoneId(Transaction transaction) {
        if ( transaction == null ) {
            return null;
        }
        Milestone milestone = transaction.getMilestone();
        if ( milestone == null ) {
            return null;
        }
        UUID id = milestone.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }
}
