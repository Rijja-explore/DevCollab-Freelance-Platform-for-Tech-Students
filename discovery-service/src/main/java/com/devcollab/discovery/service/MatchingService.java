package com.devcollab.discovery.service;

import com.devcollab.discovery.entity.MatchRecord;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.MatchRecordRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private final ProjectRepository projectRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final ProjectMatchedEventPublisher eventPublisher;
    private final com.devcollab.discovery.repository.ProjectElasticsearchRepository elasticsearchRepository;

    @Cacheable(value = "recommendations", key = "#studentId")
    @Transactional(readOnly = true)
    public List<ProjectRecommendation> getRecommendations(String studentId) {
        log.info("Calculating skill recommendations for student: {}", studentId);

        StudentProfile student = studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElse(null);

        Set<String> studentSkills = (student != null && student.getSkills() != null)
                ? student.getSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Set.of("react", "node.js", "java", "python", "typescript");

        double rating = (student != null && student.getRating() != null) ? student.getRating() : 4.5;

        List<Project> openProjects = projectRepository.findByStatus(ProjectStatus.OPEN);

        List<ProjectRecommendation> recommendations = new ArrayList<>();
        for (Project project : openProjects) {
            Set<String> projectSkills = project.getRequiredSkills() != null
                    ? project.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                    : Collections.emptySet();

            Set<String> matching = new HashSet<>(projectSkills);
            matching.retainAll(studentSkills);

            double skillMatchRatio = projectSkills.isEmpty() ? 0.5 : ((double) matching.size() / projectSkills.size());
            double score = (skillMatchRatio * 0.70) + ((rating / 5.0) * 0.30);
            double roundedScore = BigDecimal.valueOf(score * 100).setScale(1, RoundingMode.HALF_UP).doubleValue();

            recommendations.add(ProjectRecommendation.builder()
                    .project(project)
                    .matchScore(roundedScore)
                    .matchingSkills(new ArrayList<>(matching))
                    .build());
        }

        recommendations.sort(Comparator.comparingDouble(ProjectRecommendation::getMatchScore).reversed());
        return recommendations;
    }

    @Transactional
    public MatchResult applyForProject(String projectId, String studentId) {
        log.info("Student {} applying for project {}", studentId, projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        if (project.getStatus() != ProjectStatus.OPEN) {
            log.info("Project {} is already {}", projectId, project.getStatus());
            throw new IllegalStateException("This project has already been accepted and is no longer available.");
        }

        List<MatchRecord> existingMatches = matchRecordRepository.findByProjectId(projectId);
        boolean alreadyAcceptedByOther = existingMatches.stream()
                .anyMatch(m -> "ACCEPTED".equalsIgnoreCase(m.getStatus()) && !studentId.equals(m.getStudentId()));
        if (alreadyAcceptedByOther) {
            throw new IllegalStateException("This project has already been accepted by another student.");
        }

        StudentProfile student = studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElseGet(() -> {
                    log.info("Student profile not found for {} — auto-provisioning profile for application", studentId);
                    StudentProfile p = new StudentProfile();
                    p.setId(studentId);
                    p.setUserId(studentId);
                    p.setFullName("Student Developer");
                    p.setHeadline("Computer Science Student");
                    p.setRating(4.9);
                    p.setSkills(new HashSet<>(List.of("react", "node.js", "typescript", "spring boot", "postgresql")));
                    return studentProfileRepository.save(p);
                });

        Set<String> studentSkills = (student.getSkills() != null && !student.getSkills().isEmpty())
                ? student.getSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Set.of();

        Set<String> projectSkills = project.getRequiredSkills() != null
                ? project.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Set.of();

        Set<String> matching = new HashSet<>(projectSkills);
        matching.retainAll(studentSkills);
        
        double skillRatio = projectSkills.isEmpty() ? 0.0 : ((double) matching.size() / projectSkills.size());
        double studentRating = (student.getRating() != null) ? student.getRating() : 0.0;
        double ratingComponent = (studentRating / 5.0) * 0.30;
        double skillComponent = skillRatio * 0.70;
        double weightedScore = (skillComponent + ratingComponent) * 100;
        double score = BigDecimal.valueOf(weightedScore).setScale(1, RoundingMode.HALF_UP).doubleValue();

        String canonicalStudentId = (student.getUserId() != null && !student.getUserId().isBlank())
                ? student.getUserId()
                : (student.getId() != null ? student.getId() : studentId);

        MatchRecord match = matchRecordRepository.findByProjectIdAndStudentId(projectId, canonicalStudentId)
                .map(existing -> {
                    existing.setMatchScore(score);
                    if ("REJECTED".equalsIgnoreCase(existing.getStatus())) {
                        existing.setStatus("PENDING");
                    }
                    return matchRecordRepository.save(existing);
                })
                .orElseGet(() -> {
                    MatchRecord newMatch = MatchRecord.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .startupId(project.getStartupId())
                            .studentId(canonicalStudentId)
                            .matchScore(score)
                            .status("PENDING")
                            .build();
                    return matchRecordRepository.save(newMatch);
                });

        log.info("Application recorded for project {} and student {} with status PENDING", projectId, studentId);

        return MatchResult.builder()
                .matchId(match.getId())
                .projectId(project.getId())
                .startupId(project.getStartupId())
                .studentId(studentId)
                .matchScore(score)
                .status(match.getStatus())
                .matchedAt(match.getMatchedAt() != null ? match.getMatchedAt().toString() : java.time.Instant.now().toString())
                .message("Application submitted! Waiting for startup owner review and approval.")
                .build();
    }

    @Transactional
    public MatchResult approveMatch(String matchId, String startupId) {
        log.info("Startup {} approving match {}", startupId, matchId);

        MatchRecord match = matchRecordRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match application not found: " + matchId));

        Project project = projectRepository.findById(match.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + match.getProjectId()));

        // Mark this match as ACCEPTED
        match.setStatus("ACCEPTED");
        matchRecordRepository.save(match);

        // Reject other pending applications for this project
        List<MatchRecord> allMatches = matchRecordRepository.findByProjectId(project.getId());
        for (MatchRecord other : allMatches) {
            if (!other.getId().equals(matchId) && "PENDING".equalsIgnoreCase(other.getStatus())) {
                other.setStatus("REJECTED");
                matchRecordRepository.save(other);
                log.info("Auto-declined competing application {} for project {}", other.getId(), project.getId());
            }
        }

        // Transition project to MATCHED so it is no longer shown to other students
        project.setStatus(ProjectStatus.MATCHED);
        projectRepository.save(project);

        try {
            elasticsearchRepository.findById(project.getId()).ifPresent(doc -> {
                doc.setStatus(ProjectStatus.MATCHED.name());
                elasticsearchRepository.save(doc);
            });
        } catch (Exception e) {
            log.warn("Could not update project status in Elasticsearch: {}", e.getMessage());
        }

        // Trigger RabbitMQ event -> Workspace & Escrow creation ONLY now!
        eventPublisher.publishProjectMatched(project, match.getStudentId());
        log.info("Approved match {}. Dispatched project.matched to RabbitMQ for Workspace and Escrow creation", matchId);

        return MatchResult.builder()
                .matchId(match.getId())
                .projectId(project.getId())
                .startupId(project.getStartupId())
                .studentId(match.getStudentId())
                .matchScore(match.getMatchScore())
                .status("ACCEPTED")
                .matchedAt(match.getMatchedAt() != null ? match.getMatchedAt().toString() : java.time.Instant.now().toString())
                .message("Application approved! Workspace and Escrow initialized.")
                .build();
    }

    @Transactional
    public MatchResult rejectMatch(String matchId, String startupId) {
        log.info("Startup {} rejecting match {}", startupId, matchId);

        MatchRecord match = matchRecordRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match application not found: " + matchId));

        match.setStatus("REJECTED");
        matchRecordRepository.save(match);

        return MatchResult.builder()
                .matchId(match.getId())
                .projectId(match.getProjectId())
                .startupId(match.getStartupId())
                .studentId(match.getStudentId())
                .matchScore(match.getMatchScore())
                .status("REJECTED")
                .matchedAt(match.getMatchedAt() != null ? match.getMatchedAt().toString() : java.time.Instant.now().toString())
                .message("Application rejected.")
                .build();
    }

    @Transactional
    public MatchResult matchProject(String projectId, String studentId) {
        // Alias for applyForProject
        return applyForProject(projectId, studentId);
    }

    @CacheEvict(value = "recommendations", allEntries = true)
    @Transactional
    public void refreshRecommendations() {
        // This method triggers cache eviction
        log.debug("Recommendations cache evicted");
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectRecommendation {
        private Project project;
        private Double matchScore;
        private List<String> matchingSkills;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchResult {
        private String matchId;
        private String projectId;
        private String startupId;
        private String studentId;
        private Double matchScore;
        private String status;
        private String matchedAt;
        private String message;
    }
}
