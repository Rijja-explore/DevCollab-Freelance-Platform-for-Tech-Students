package com.devcollab.discovery.skillgap;

import java.util.List;

public final class SkillGapTypes {
    private SkillGapTypes() {
    }

    public enum Severity {
        NONE, LOW, MEDIUM, HIGH, CRITICAL
    }

    public record Course(String courseId, String title, String skill, String provider,
                         double durationHours, double price, String currency,
                         String difficulty, String url) {
    }

    public record CourseRecommendation(String courseId, String title, String skill,
                                       String provider, double durationHours, double price,
                                       String currency, String difficulty, String url,
                                       String reason, double score, String resourceType,
                                       long viewCount, int itemCount) {
    }

    public record SkillGapAnalysis(String studentId, String projectId, String projectTitle,
                                   List<String> studentSkills, List<String> requiredSkills,
                                   List<String> matchedSkills, List<String> missingSkills,
                                   double coverage, Severity severity, List<String> explanations,
                                   List<CourseRecommendation> recommendations) {
    }
}