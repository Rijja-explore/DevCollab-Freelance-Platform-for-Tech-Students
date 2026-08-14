package com.devcollab.escrow.mapper;

import com.devcollab.escrow.dto.response.AuditLogResponse;
import com.devcollab.escrow.entity.AuditLog;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-08-12T13:31:29+0530",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.12 (Oracle Corporation)"
)
@Component
public class AuditLogMapperImpl implements AuditLogMapper {

    @Override
    public AuditLogResponse toResponse(AuditLog auditLog) {
        if ( auditLog == null ) {
            return null;
        }

        AuditLogResponse.AuditLogResponseBuilder auditLogResponse = AuditLogResponse.builder();

        auditLogResponse.id( auditLog.getId() );
        auditLogResponse.entityType( auditLog.getEntityType() );
        auditLogResponse.entityId( auditLog.getEntityId() );
        auditLogResponse.action( auditLog.getAction() );
        auditLogResponse.actor( auditLog.getActor() );
        auditLogResponse.description( auditLog.getDescription() );
        auditLogResponse.metadata( auditLog.getMetadata() );
        auditLogResponse.createdAt( auditLog.getCreatedAt() );

        return auditLogResponse.build();
    }

    @Override
    public List<AuditLogResponse> toResponseList(List<AuditLog> auditLogs) {
        if ( auditLogs == null ) {
            return null;
        }

        List<AuditLogResponse> list = new ArrayList<AuditLogResponse>( auditLogs.size() );
        for ( AuditLog auditLog : auditLogs ) {
            list.add( toResponse( auditLog ) );
        }

        return list;
    }
}
