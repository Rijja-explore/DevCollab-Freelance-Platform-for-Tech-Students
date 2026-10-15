package com.devcollab.discovery.skillgap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import static com.devcollab.discovery.skillgap.SkillGapTypes.Course;
import static com.devcollab.discovery.skillgap.SkillGapTypes.CourseRecommendation;

@Service
public class CourseRecommendationService {
    private final CourseCatalog courseCatalog;
    private final YouTubeLearningResourceService youTubeLearningResourceService;

    public CourseRecommendationService(CourseCatalog courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.youTubeLearningResourceService = null;
    }

    @Autowired
    public CourseRecommendationService(CourseCatalog courseCatalog,
                                       YouTubeLearningResourceService youTubeLearningResourceService) {
        this.courseCatalog = courseCatalog;
        this.youTubeLearningResourceService = youTubeLearningResourceService;
    }

    public List<CourseRecommendation> recommend(List<String> missingSkills) {
        List<CourseRecommendation> recommendations = new ArrayList<>();
        for (String missingSkill : missingSkills) {
            List<CourseRecommendation> perSkill = youTubeRecommendations(missingSkill);
            if (perSkill.isEmpty()) {
                perSkill = courseCatalog.findBySkill(missingSkill).stream()
                    .map(this::toRecommendation)
                    .sorted(Comparator.comparingDouble(CourseRecommendation::score).reversed()
                            .thenComparingDouble(CourseRecommendation::price)
                            .thenComparingDouble(CourseRecommendation::durationHours))
                    .limit(1)
                    .toList();
            }
            if (perSkill.isEmpty()) {
                perSkill = List.of(searchFallback(missingSkill));
            }
            recommendations.addAll(perSkill);
        }
        return recommendations;
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
                course.durationHours(), course.price(), course.currency(), course.difficulty(), course.url(), reason, score,
                "DOCUMENTATION", 0, 0);
    }

    private List<CourseRecommendation> youTubeRecommendations(String skill) {
        return youTubeLearningResourceService == null
                ? List.of()
                : youTubeLearningResourceService.findBySkill(skill).stream()
                .sorted(Comparator.comparingDouble(CourseRecommendation::score).reversed())
                .limit(1)
                .toList();
    }

    private CourseRecommendation searchFallback(String skill) {
        String encodedSkill = URLEncoder.encode(skill, StandardCharsets.UTF_8);
        return new CourseRecommendation(
                "youtube-search-" + encodedSkill,
                "Search YouTube for " + skill + " tutorials",
                skill,
                "YouTube",
                0,
                0,
                "USD",
                "Beginner",
                "https://www.youtube.com/results?search_query=" + encodedSkill + "+tutorial",
                "No playlist was available; search YouTube for free tutorials.",
                50,
                "SEARCH",
                0,
                0
        );
    }

    private boolean isBeginnerOrIntermediate(String difficulty) {
        return "Beginner".equalsIgnoreCase(difficulty) || "Intermediate".equalsIgnoreCase(difficulty);
    }
}