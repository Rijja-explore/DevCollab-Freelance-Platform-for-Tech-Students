package com.devcollab.discovery.controller;

import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.service.ProjectService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProjects(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<Project> projects = projectService.getAllProjects(category, status, page, size);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", projects);
        response.put("count", projects.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProjectById(@PathVariable String id) {
        return projectService.getProjectById(id)
                .map(project -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("data", project);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "error", "Project not found")));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProject(@RequestBody CreateProjectDto dto) {
        Project project = projectService.createProject(
                dto.getStartupId(),
                dto.getTitle(),
                dto.getDescription(),
                dto.getCategory(),
                dto.getBudget(),
                dto.getCurrency(),
                dto.getRequiredSkills()
        );
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", project);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) String category) {

        List<Project> results = projectService.searchProjects(q, skills, category);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", results);
        response.put("count", results.size());
        return ResponseEntity.ok(response);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateProjectDto {
        private String startupId;
        private String title;
        private String description;
        private String category;
        private BigDecimal budget;
        private String currency;
        private Set<String> requiredSkills;
    }
}
