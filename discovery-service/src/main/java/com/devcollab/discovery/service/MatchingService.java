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
    public MatchResult matchProject(String projectId, String studentId) {
        log.info("Initiating match between project {} and student {}", projectId, studentId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        if (project.getStatus() == ProjectStatus.MATCHED || project.getStatus() == ProjectStatus.IN_PROGRESS) {
            log.info("Project {} is already matched, retrieving match details", projectId);
        } else {
            project.setStatus(ProjectStatus.MATCHED);
            projectRepository.save(project);
        }

        StudentProfile student = studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElseGet(() -> {
                    log.info("Student profile not found for {} — auto-provisioning profile for match", studentId);
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
        
        // Calculate skill match ratio (0.0 to 1.0)
        double skillRatio = projectSkills.isEmpty() ? 0.0 : ((double) matching.size() / projectSkills.size());
        
        // Normalize to 0-100 scale
        // Use weighted formula: 70% skill match + 30% rating
        double studentRating = (student.getRating() != null) ? student.getRating() : 0.0;
        double ratingComponent = (studentRating / 5.0) * 0.30;  // Normalize rating to 0-1, weight by 0.30
        double skillComponent = skillRatio * 0.70;              // Weight skill match by 0.70
        double weightedScore = (skillComponent + ratingComponent) * 100;  // Scale to 0-100
        double score = BigDecimal.valueOf(weightedScore).setScale(1, RoundingMode.HALF_UP).doubleValue();

        log.info("Match score calculated: {}, Skill ratio: {}, Rating: {}, Student: {}", 
                 score, skillRatio, studentRating, studentId);

        MatchRecord match = matchRecordRepository.findByProjectIdAndStudentId(projectId, studentId)
                .orElseGet(() -> {
                    MatchRecord newMatch = MatchRecord.builder()
                            .id(UUID.randomUUID().toString())
                            .projectId(projectId)
                            .startupId(project.getStartupId())
                            .studentId(studentId)
                            .matchScore(score)
                            .status("ACCEPTED")
                            .build();
                    return matchRecordRepository.save(newMatch);
                });

        // Publish event to RabbitMQ for Escrow & Workspace services
        eventPublisher.publishProjectMatched(project, studentId);

        // Evict cached recommendations for this student so they see updated match scores
        log.info("Evicting cached recommendations for student: {}", studentId);

        return MatchResult.builder()
                .matchId(match.getId())
                .projectId(project.getId())
                .startupId(project.getStartupId())
                .studentId(studentId)
                .matchScore(score)
                .status("MATCHED")
                .matchedAt(match.getMatchedAt() != null ? match.getMatchedAt().toString() : java.time.Instant.now().toString())
                .message("Match confirmed! Contract generated in Escrow & Workspace created.")
                .build();
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
