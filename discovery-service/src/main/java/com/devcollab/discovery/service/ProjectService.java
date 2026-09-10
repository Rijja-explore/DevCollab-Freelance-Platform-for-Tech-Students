package com.devcollab.discovery.service;

import com.devcollab.discovery.document.ProjectDocument;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.repository.ProjectElasticsearchRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectElasticsearchRepository elasticsearchRepository;

    @Transactional(readOnly = true)
    public List<Project> getAllProjects(String category, String status, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (status != null && !status.isBlank()) {
            try {
                ProjectStatus st = ProjectStatus.valueOf(status.toUpperCase());
                return projectRepository.findByStatus(st, pageRequest).getContent();
            } catch (Exception ignored) {}
        }

        if (category != null && !category.isBlank()) {
            return projectRepository.findByCategoryIgnoreCase(category);
        }

        Page<Project> projectPage = projectRepository.findAll(pageRequest);
        return projectPage.getContent();
    }

    @Cacheable(value = "projects", key = "#id")
    @Transactional(readOnly = true)
    public Optional<Project> getProjectById(String id) {
        log.info("Fetching project {} from PostgreSQL database", id);
        return projectRepository.findById(id);
    }

    @CacheEvict(value = "projects", allEntries = true)
    @Transactional
    public Project createProject(String startupId, String title, String description,
                                 String category, BigDecimal budget, String currency,
                                 Set<String> requiredSkills) {
        if (startupId == null || startupId.isBlank()) {
            startupId = UUID.randomUUID().toString();
        }
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }

        Project project = Project.builder()
                .startupId(startupId)
                .title(title)
                .description(description)
                .category(category)
                .budget(budget != null ? budget : BigDecimal.valueOf(1000.00))
                .currency(currency)
                .status(ProjectStatus.OPEN)
                .requiredSkills(requiredSkills != null ? requiredSkills : new HashSet<>())
                .build();

        Project saved = projectRepository.save(project);
        log.info("Created new project: {} ({})", saved.getTitle(), saved.getId());

        // Index in Elasticsearch
        try {
            ProjectDocument doc = ProjectDocument.builder()
                    .id(saved.getId())
                    .startupId(saved.getStartupId())
                    .title(saved.getTitle())
                    .description(saved.getDescription())
                    .category(saved.getCategory())
                    .skills(new ArrayList<>(saved.getRequiredSkills()))
                    .budget(saved.getBudget() != null ? saved.getBudget().doubleValue() : 0.0)
                    .currency(saved.getCurrency())
                    .status(saved.getStatus().name())
                    .build();
            elasticsearchRepository.save(doc);
            log.info("Indexed project {} in Elasticsearch", saved.getId());
        } catch (Exception e) {
            log.warn("Could not index project in Elasticsearch (continuing with DB only): {}", e.getMessage());
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Project> searchProjects(String keyword, List<String> skills, String category) {
        // Try Elasticsearch first
        try {
            if (keyword != null && !keyword.isBlank()) {
                List<ProjectDocument> docs = elasticsearchRepository.findByTitleContainingOrDescriptionContaining(keyword, keyword);
                if (!docs.isEmpty()) {
                    List<String> ids = docs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids);
                }
            }
            if (skills != null && !skills.isEmpty()) {
                List<ProjectDocument> docs = elasticsearchRepository.findBySkillsIn(skills);
                if (!docs.isEmpty()) {
                    List<String> ids = docs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids);
                }
            }
            if (category != null && !category.isBlank()) {
                List<ProjectDocument> docs = elasticsearchRepository.findByCategoryIgnoreCase(category);
                if (!docs.isEmpty()) {
                    List<String> ids = docs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids);
                }
            }
        } catch (Exception e) {
            log.warn("Elasticsearch search failed, falling back to PostgreSQL: {}", e.getMessage());
        }

        // Graceful fallback to PostgreSQL
        if (keyword != null && !keyword.isBlank()) {
            return projectRepository.searchByKeyword(keyword);
        }
        if (skills != null && !skills.isEmpty()) {
            List<String> lower = skills.stream().map(String::toLowerCase).toList();
            return projectRepository.findBySkillsIn(lower);
        }
        if (category != null && !category.isBlank()) {
            return projectRepository.findByCategoryIgnoreCase(category);
        }

        return projectRepository.findAll();
    }

    @CacheEvict(value = "projects", allEntries = true)
    @Transactional
    public Project updateStatus(String id, ProjectStatus status) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        project.setStatus(status);
        Project updated = projectRepository.save(project);

        try {
            elasticsearchRepository.findById(id).ifPresent(doc -> {
                doc.setStatus(status.name());
                elasticsearchRepository.save(doc);
            });
        } catch (Exception ignored) {}

        return updated;
    }
}
