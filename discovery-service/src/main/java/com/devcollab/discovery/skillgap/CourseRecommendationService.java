package com.devcollab.discovery.skillgap;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static com.devcollab.discovery.skillgap.SkillGapTypes.Course;
import static com.devcollab.discovery.skillgap.SkillGapTypes.CourseRecommendation;

@Service
public class CourseRecommendationService {
    private final CourseCatalog courseCatalog;

    public CourseRecommendationService(CourseCatalog courseCatalog) {
        this.courseCatalog = courseCatalog;
    }

    public List<CourseRecommendation> recommend(List<String> missingSkills) {
        List<CourseRecommendation> recommendations = new ArrayList<>();
        for (String missingSkill : missingSkills) {
            List<CourseRecommendation> perSkill = courseCatalog.findBySkill(missingSkill).stream()
                    .map(this::toRecommendation)
                    .sorted(Comparator.comparingDouble(CourseRecommendation::score).reversed()
                            .thenComparingDouble(CourseRecommendation::price)
                            .thenComparingDouble(CourseRecommendation::durationHours))
                    .limit(2)
                    .toList();
            recommendations.addAll(perSkill);
        }
        return recommendations.stream()
            .sorted(Comparator.comparingDouble(CourseRecommendation::score).reversed()
                .thenComparingDouble(CourseRecommendation::price)
                .thenComparingDouble(CourseRecommendation::durationHours))
            .limit(5)
            .toList();
    }

    private CourseRecommendation toRecommendation(Course course) {
        double score = 100
                + (course.price() == 0 ? 15 : 0)
                + (isBeginnerOrIntermediate(course.difficulty()) ? 10 : 0)
                + (course.durationHours() <= 4 ? 10 : 0)
                - (2 * course.durationHours());

        List<String> advantages = new ArrayList<>();
        if (course.price() == 0) advantages.add("free");
        if (isBeginnerOrIntermediate(course.difficulty())) advantages.add(course.difficulty().toLowerCase() + " level");
        if (course.durationHours() <= 4) advantages.add("short duration");
        String reason = "Matches the missing " + course.skill() + " skill"
                + (advantages.isEmpty() ? "" : " and is " + String.join(", ", advantages)) + ".";

        return new CourseRecommendation(course.courseId(), course.title(), course.skill(), course.provider(),
                course.durationHours(), course.price(), course.currency(), course.difficulty(), course.url(), reason, score);
    }

    private boolean isBeginnerOrIntermediate(String difficulty) {
        return "Beginner".equalsIgnoreCase(difficulty) || "Intermediate".equalsIgnoreCase(difficulty);
    }
}