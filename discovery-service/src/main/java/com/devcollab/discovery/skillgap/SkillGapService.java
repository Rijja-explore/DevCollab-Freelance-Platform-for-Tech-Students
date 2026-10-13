package com.devcollab.discovery.skillgap;

import com.devcollab.discovery.entity.MatchRecord;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.MatchRecordRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.devcollab.discovery.skillgap.SkillGapTypes.CourseRecommendation;
import static com.devcollab.discovery.skillgap.SkillGapTypes.Severity;
import static com.devcollab.discovery.skillgap.SkillGapTypes.SkillGapAnalysis;

@Service
public class SkillGapService {
    private static final Map<String, String> ALIASES = Map.of(
            "nodejs", "node.js",
            "reactjs", "react",
            "postgres", "postgresql",
            "k8s", "kubernetes",
            "gh-actions", "github actions"
    );

    private final StudentProfileRepository studentProfileRepository;
    private final ProjectRepository projectRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final CourseRecommendationService recommendationService;

    public SkillGapService(StudentProfileRepository studentProfileRepository,
                           ProjectRepository projectRepository,
                           MatchRecordRepository matchRecordRepository,
                           CourseRecommendationService recommendationService) {
        this.studentProfileRepository = studentProfileRepository;
        this.projectRepository = projectRepository;
        this.matchRecordRepository = matchRecordRepository;
        this.recommendationService = recommendationService;
    }

    public SkillGapAnalysis analyze(String studentId, String projectId) {
        StudentProfile student = findStudent(studentId);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        Map<String, String> requiredDisplay = displaySkills(project.getRequiredSkills());
        Set<String> studentNormalized = normalizeSkills(student.getSkills());
        List<String> matched = requiredDisplay.entrySet().stream()
                .filter(entry -> studentNormalized.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .toList();
        List<String> missing = requiredDisplay.entrySet().stream()
                .filter(entry -> !studentNormalized.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .toList();
        double coverage = requiredDisplay.isEmpty() ? 1.0 : (double) matched.size() / requiredDisplay.size();
        List<String> explanations = missing.stream()
                .map(skill -> "Missing " + skill + " because project '" + project.getTitle() + "' requires " + skill + ".")
                .toList();
        List<String> studentDisplay = displaySkillsForResponse(student.getSkills());
        List<CourseRecommendation> recommendations = recommendationService.recommend(missing);

        return new SkillGapAnalysis(student.getId(), project.getId(), project.getTitle(), studentDisplay,
                new ArrayList<>(requiredDisplay.values()), matched, missing, coverage,
                severity(matched.size(), requiredDisplay.size()), explanations, recommendations);
    }

    public SkillGapAnalysis analyzeFailedMatch(String matchId) {
        MatchRecord match = matchRecordRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + matchId));
            if (!"REJECTED".equalsIgnoreCase(match.getStatus())
                && (match.getMatchScore() == null || match.getMatchScore() >= 50)) {
            throw new IllegalArgumentException("Match is not rejected or low-scoring: " + matchId);
        }
        return analyze(match.getStudentId(), match.getProjectId());
    }

    public StudentProfile findStudent(String studentId) {
        return studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found: " + studentId));
    }

    public static String normalizeSkill(String skill) {
        if (skill == null) return "";
        String normalized = skill.trim().toLowerCase(Locale.ROOT);
        return ALIASES.getOrDefault(normalized, normalized);
    }

    private Map<String, String> displaySkills(Set<String> skills) {
        if (skills == null) return Collections.emptyMap();
        return skills.stream()
                .filter(skill -> skill != null && !skill.isBlank())
                .map(skill -> Map.entry(normalizeSkill(skill), skill.trim()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (first, ignored) -> first, LinkedHashMap::new));
    }

    private List<String> displaySkillsForResponse(Set<String> skills) {
        if (skills == null) return List.of();
        return skills.stream().filter(skill -> skill != null && !skill.isBlank()).map(String::trim).distinct().toList();
    }

    private Set<String> normalizeSkills(Set<String> skills) {
        if (skills == null) return Set.of();
        return skills.stream().map(SkillGapService::normalizeSkill).filter(skill -> !skill.isEmpty()).collect(Collectors.toSet());
    }

    private Severity severity(int matchedCount, int requiredCount) {
        if (requiredCount == 0 || matchedCount == requiredCount) return Severity.NONE;
        if (matchedCount * 4 >= requiredCount * 3) return Severity.LOW;
        if (matchedCount * 2 >= requiredCount) return Severity.MEDIUM;
        if (matchedCount > 0) return Severity.HIGH;
        return Severity.CRITICAL;
    }
}