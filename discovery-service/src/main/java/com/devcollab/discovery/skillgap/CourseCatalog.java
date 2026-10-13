package com.devcollab.discovery.skillgap;

import org.springframework.stereotype.Component;

import java.util.List;

import static com.devcollab.discovery.skillgap.SkillGapTypes.Course;

@Component
public class CourseCatalog {
    private final List<Course> courses = List.of(
            new Course("course-001", "FastAPI Fundamentals", "FastAPI", "FreeCodeCamp", 30, 0, "USD", "Beginner", "https://mock.catalog.local/course-001"),
            new Course("course-002", "FastAPI Production Patterns", "FastAPI", "Udemy Mock", 6, 19, "USD", "Intermediate", "https://mock.catalog.local/course-002"),
            new Course("course-003", "Docker Basics", "Docker", "Docker Mock Labs", 4, 0, "USD", "Beginner", "https://mock.catalog.local/course-003"),
            new Course("course-004", "Docker Deep Dive", "Docker", "Pluralsight Mock", 8, 29, "USD", "Intermediate", "https://mock.catalog.local/course-004"),
            new Course("course-005", "K8s Starter", "Kubernetes", "CNCF Mock", 5, 0, "USD", "Beginner", "https://mock.catalog.local/course-005")
    );

    public List<Course> findBySkill(String skill) {
        return courses.stream()
                .filter(course -> course.skill().equalsIgnoreCase(skill))
                .toList();
    }
}