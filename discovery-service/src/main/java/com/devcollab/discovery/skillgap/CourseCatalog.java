package com.devcollab.discovery.skillgap;

import org.springframework.stereotype.Component;

import java.util.List;

import static com.devcollab.discovery.skillgap.SkillGapTypes.Course;

@Component
public class CourseCatalog {
    private final List<Course> courses = List.of(
            new Course("course-001", "FastAPI Fundamentals", "FastAPI", "FastAPI Official Docs", 30, 0, "USD", "Beginner", "https://fastapi.tiangolo.com/learn/"),
            new Course("course-002", "FastAPI Production Patterns", "FastAPI", "FastAPI Official Docs", 6, 19, "USD", "Intermediate", "https://fastapi.tiangolo.com/advanced/"),
            new Course("course-003", "Docker Basics", "Docker", "Docker Official Docs", 4, 0, "USD", "Beginner", "https://docs.docker.com/get-started/"),
            new Course("course-004", "Docker Deep Dive", "Docker", "Docker Official Docs", 8, 29, "USD", "Intermediate", "https://docs.docker.com/engine/"),
            new Course("course-005", "K8s Starter", "Kubernetes", "Kubernetes Official Docs", 5, 0, "USD", "Beginner", "https://kubernetes.io/docs/tutorials/kubernetes-basics/")
    );

    public List<Course> findBySkill(String skill) {
        return courses.stream()
                .filter(course -> course.skill().equalsIgnoreCase(skill))
                .toList();
    }
}