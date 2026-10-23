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

            String fitReason = String.format("%.0f%% skills match (%s)", skillMatchRatio * 100,
                    matching.isEmpty() ? "general fit" : String.join(", ", matching));

            recommendations.add(ProjectRecommendation.builder()
                    .project(project)
                    .matchScore(roundedScore)
                    .matchingSkills(new ArrayList<>(matching))
                    .fitReason(fitReason)
                    .build());
        }

        recommendations.sort(Comparator.comparingDouble(ProjectRecommendation::getMatchScore).reversed());
        return recommendations;
    }

    /**
     * Recommends top matching student candidates for a specific project
     */
    @Transactional(readOnly = true)
    public List<CandidateRecommendation> getRecommendedCandidatesForProject(String projectId, int limit) {
        log.info("Finding candidate recommendations for project: {}", projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        Set<String> projectSkills = project.getRequiredSkills() != null
                ? project.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Collections.emptySet();

        double projectBudget = project.getBudget() != null ? project.getBudget().doubleValue() : 1000.0;

        List<StudentProfile> allStudents = studentProfileRepository.findAll();
        List<CandidateRecommendation> candidates = new ArrayList<>();

        for (StudentProfile student : allStudents) {
            Set<String> studentSkills = student.getSkills() != null
                    ? student.getSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                    : Collections.emptySet();

            Set<String> matching = new HashSet<>(projectSkills);
            matching.retainAll(studentSkills);

            Set<String> missing = new HashSet<>(projectSkills);
            missing.removeAll(studentSkills);

            double skillRatio = projectSkills.isEmpty() ? 0.5 : ((double) matching.size() / projectSkills.size());
            double studentRating = student.getRating() != null ? student.getRating() : 4.0;
            double ratingRatio = Math.min(1.0, studentRating / 5.0);

            // Rate fit: assume ~25 hour initial milestone
            double studentHourlyRate = student.getHourlyRate() != null ? student.getHourlyRate().doubleValue() : 35.0;
            double estimatedMilestoneCost = studentHourlyRate * 25.0;
            double budgetFit = estimatedMilestoneCost <= projectBudget ? 1.0 : Math.max(0.2, projectBudget / estimatedMilestoneCost);

            // Reviews reputation bonus (up to 5 points)
            int reviewCount = student.getReviewCount() != null ? student.getReviewCount() : 0;
            double reviewBonus = Math.min(5.0, reviewCount * 1.0);

            double composite = ((skillRatio * 0.55) + (ratingRatio * 0.25) + (budgetFit * 0.20)) * 100.0 + reviewBonus;
            double finalScore = BigDecimal.valueOf(Math.min(100.0, composite)).setScale(1, RoundingMode.HALF_UP).doubleValue();

            String fitReason = String.format("%.0f%% skills match (%s), %.1f★ rating (%d reviews), hourly rate $%.2f",
                    skillRatio * 100.0,
                    matching.isEmpty() ? "entry profile" : String.join(", ", matching),
                    studentRating,
                    reviewCount,
                    studentHourlyRate);

            candidates.add(CandidateRecommendation.builder()
                    .student(student)
                    .matchScore(finalScore)
                    .matchingSkills(new ArrayList<>(matching))
                    .missingSkills(new ArrayList<>(missing))
                    .fitReason(fitReason)
                    .build());
        }

        candidates.sort(Comparator.comparingDouble(CandidateRecommendation::getMatchScore).reversed());
        int targetLimit = Math.max(1, limit);
        return candidates.stream().limit(targetLimit).collect(Collectors.toList());
    }

    /**
     * Recommends projects similar to the given project
     */
    @Transactional(readOnly = true)
    public List<SimilarProjectRecommendation> getSimilarProjects(String projectId, int limit) {
        log.info("Finding similar projects for project: {}", projectId);

        Project targetProject = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        Set<String> targetSkills = targetProject.getRequiredSkills() != null
                ? targetProject.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Collections.emptySet();

        String targetCategory = targetProject.getCategory() != null ? targetProject.getCategory().toLowerCase() : "";

        List<Project> openProjects = projectRepository.findByStatus(ProjectStatus.OPEN);
        List<SimilarProjectRecommendation> similar = new ArrayList<>();

        for (Project p : openProjects) {
            if (p.getId().equals(projectId)) {
                continue;
            }

            Set<String> pSkills = p.getRequiredSkills() != null
                    ? p.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                    : Collections.emptySet();

            Set<String> intersection = new HashSet<>(targetSkills);
            intersection.retainAll(pSkills);

            Set<String> union = new HashSet<>(targetSkills);
            union.addAll(pSkills);

            double jaccard = union.isEmpty() ? 0.0 : ((double) intersection.size() / union.size());
            double categoryBoost = (p.getCategory() != null && targetCategory.equalsIgnoreCase(p.getCategory())) ? 0.25 : 0.0;

            double score = BigDecimal.valueOf(Math.min(100.0, (jaccard * 0.75 + categoryBoost) * 100))
                    .setScale(1, RoundingMode.HALF_UP).doubleValue();

            similar.add(SimilarProjectRecommendation.builder()
                    .project(p)
                    .similarityScore(score)
                    .sharedSkills(new ArrayList<>(intersection))
                    .build());
        }

        similar.sort(Comparator.comparingDouble(SimilarProjectRecommendation::getSimilarityScore).reversed());
        return similar.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
    }

    /**
     * Recommends student profiles similar to the given student
     */
    @Transactional(readOnly = true)
    public List<SimilarStudentRecommendation> getSimilarStudents(String studentId, int limit) {
        log.info("Finding similar students for student: {}", studentId);

        StudentProfile targetStudent = studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found: " + studentId));

        Set<String> targetSkills = targetStudent.getSkills() != null
                ? targetStudent.getSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                : Collections.emptySet();

        double targetRate = targetStudent.getHourlyRate() != null ? targetStudent.getHourlyRate().doubleValue() : 35.0;

        List<StudentProfile> all = studentProfileRepository.findAll();
        List<SimilarStudentRecommendation> similar = new ArrayList<>();

        for (StudentProfile s : all) {
            if (s.getId().equals(targetStudent.getId())) {
                continue;
            }

            Set<String> sSkills = s.getSkills() != null
                    ? s.getSkills().stream().map(String::toLowerCase).collect(Collectors.toSet())
                    : Collections.emptySet();

            Set<String> intersection = new HashSet<>(targetSkills);
            intersection.retainAll(sSkills);

            Set<String> union = new HashSet<>(targetSkills);
            union.addAll(sSkills);

            double jaccard = union.isEmpty() ? 0.0 : ((double) intersection.size() / union.size());

            double sRate = s.getHourlyRate() != null ? s.getHourlyRate().doubleValue() : 35.0;
            double rateDiff = Math.abs(targetRate - sRate);
            double rateProximity = Math.max(0.0, 1.0 - (rateDiff / 50.0));

            double score = BigDecimal.valueOf(Math.min(100.0, ((jaccard * 0.75) + (rateProximity * 0.25)) * 100))
                    .setScale(1, RoundingMode.HALF_UP).doubleValue();

            similar.add(SimilarStudentRecommendation.builder()
                    .student(s)
                    .similarityScore(score)
                    .sharedSkills(new ArrayList<>(intersection))
                    .build());
        }

        similar.sort(Comparator.comparingDouble(SimilarStudentRecommendation::getSimilarityScore).reversed());
        return similar.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
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
        
        // Normalize to 0-100 scale: 70% skill match + 30% rating
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

        // Publish event to RabbitMQ for Escrow & Workspace services
        eventPublisher.publishProjectMatched(project, studentId);

        log.info("Evicting cached recommendations for student: {}", studentId);
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
        private String fitReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateRecommendation {
        private StudentProfile student;
        private Double matchScore;
        private List<String> matchingSkills;
        private List<String> missingSkills;
        private String fitReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimilarProjectRecommendation {
        private Project project;
        private Double similarityScore;
        private List<String> sharedSkills;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimilarStudentRecommendation {
        private StudentProfile student;
        private Double similarityScore;
        private List<String> sharedSkills;
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
