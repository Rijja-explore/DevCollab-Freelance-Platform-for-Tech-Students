package com.devcollab.discovery.skillgap;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CourseRecommendationServiceTest {
    private final CourseRecommendationService service = new CourseRecommendationService(new CourseCatalog());

    @Test
    void ranksFastApiCoursesByFormula() {
        var recommendations = service.recommend(List.of("FastAPI"));

        assertEquals(List.of("course-002", "course-001"), recommendations.stream()
                .map(SkillGapTypes.CourseRecommendation::courseId).toList());
        assertEquals(98.0, recommendations.get(0).score());
        assertEquals(65.0, recommendations.get(1).score());
    }

    @Test
    void ranksDockerCoursesByComputedScore() {
        var recommendations = service.recommend(List.of("Docker"));

        assertEquals(List.of("course-003", "course-004"), recommendations.stream()
                .map(SkillGapTypes.CourseRecommendation::courseId).toList());
        assertTrue(recommendations.get(0).reason().contains("free"));
    }

    @Test
    void ignoresUnsupportedSkillsAndCapsRecommendations() {
        var recommendations = service.recommend(List.of("COBOL", "FastAPI", "Docker", "Kubernetes"));

        assertEquals(5, recommendations.size());
        assertTrue(recommendations.stream().noneMatch(course -> course.skill().equalsIgnoreCase("COBOL")));
    }
}