package com.devcollab.discovery.repository;

import com.devcollab.discovery.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRecordRepository extends JpaRepository<MatchRecord, String> {
    List<MatchRecord> findByStudentId(String studentId);
    List<MatchRecord> findByStartupId(String startupId);
    List<MatchRecord> findByProjectId(String projectId);
    Optional<MatchRecord> findByProjectIdAndStudentId(String projectId, String studentId);
}
