package com.devcollab.discovery.controller;

import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import com.devcollab.discovery.service.MatchingService;
import com.devcollab.discovery.service.ProjectService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.*;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ProjectGraphQLController {

    private final ProjectService projectService;
    private final MatchingService matchingService;
    private final StudentProfileRepository studentProfileRepository;

    @QueryMapping
    public List<Project> projects(@Argument String category, @Argument String status,
                                  @Argument Integer page, @Argument Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : 20;
        return projectService.getAllProjects(category, status, p, s);
    }

    @QueryMapping
    public Project project(@Argument String id) {
        return projectService.getProjectById(id).orElse(null);
    }

    @QueryMapping
    public List<Project> searchProjects(@Argument String keyword, @Argument List<String> skills,
                                       @Argument String category) {
        return projectService.searchProjects(keyword, skills, category);
    }

    @QueryMapping
    public List<MatchingService.ProjectRecommendation> matchRecommendations(@Argument String studentId) {
        return matchingService.getRecommendations(studentId);
    }

    @QueryMapping
    public StudentProfile studentProfile(@Argument String id) {
        return studentProfileRepository.findById(id)
                .or(() -> studentProfileRepository.findByUserId(id))
                .orElse(null);
    }

    @QueryMapping
    public List<StudentProfile> allStudentProfiles() {
        return studentProfileRepository.findAll();
    }

    @MutationMapping
    public Project createProject(@Argument CreateProjectInput input) {
        return projectService.createProject(
                input.getStartupId(),
                input.getTitle(),
                input.getDescription(),
                input.getCategory(),
                input.getBudget() != null ? BigDecimal.valueOf(input.getBudget()) : BigDecimal.valueOf(1000.00),
                input.getCurrency() != null ? input.getCurrency() : "USD",
                input.getRequiredSkills() != null ? new HashSet<>(input.getRequiredSkills()) : new HashSet<>()
        );
    }

    @MutationMapping
    public Project updateProjectStatus(@Argument String id, @Argument String status) {
        return projectService.updateStatus(id, ProjectStatus.valueOf(status.toUpperCase()));
    }

    @MutationMapping
    public MatchingService.MatchResult matchProject(@Argument String projectId, @Argument String studentId) {
        return matchingService.matchProject(projectId, studentId);
    }

    @MutationMapping
    public StudentProfile createStudentProfile(@Argument CreateStudentProfileInput input) {
        StudentProfile profile = StudentProfile.builder()
                .userId(input.getUserId() != null ? input.getUserId() : UUID.randomUUID().toString())
                .fullName(input.getFullName())
                .headline(input.getHeadline())
                .bio(input.getBio())
                .hourlyRate(input.getHourlyRate() != null ? BigDecimal.valueOf(input.getHourlyRate()) : BigDecimal.valueOf(35.00))
                .skills(input.getSkills() != null ? new HashSet<>(input.getSkills()) : new HashSet<>())
                .build();
        return studentProfileRepository.save(profile);
    }

    @Data
    public static class CreateProjectInput {
        private String startupId;
        private String title;
        private String description;
        private String category;
        private Double budget;
        private String currency;
        private List<String> requiredSkills;
    }

    @Data
    public static class CreateStudentProfileInput {
        private String userId;
        private String fullName;
        private String headline;
        private String bio;
        private Double hourlyRate;
        private List<String> skills;
    }
}
