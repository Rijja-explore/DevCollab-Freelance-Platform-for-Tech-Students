package com.devcollab.discovery.service;

import com.devcollab.discovery.document.ProjectDocument;
import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ProjectSearchCriteria;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.repository.ProjectElasticsearchRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import com.devcollab.discovery.specification.ProjectSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
                if (category != null && !category.isBlank()) {
                    return projectRepository.findByCategoryIgnoreCaseAndStatus(category, st, pageRequest).getContent();
                }
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

    @CacheEvict(value = {"projects", "recommendations"}, allEntries = true)
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
            List<String> indexedSkills = saved.getRequiredSkills() != null
                ? saved.getRequiredSkills().stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList())
                : new ArrayList<>();
            
            ProjectDocument doc = ProjectDocument.builder()
                    .id(saved.getId())
                    .startupId(saved.getStartupId())
                    .title(saved.getTitle())
                    .description(saved.getDescription())
                    .category(saved.getCategory())
                    .skills(indexedSkills)
                    .budget(saved.getBudget() != null ? saved.getBudget().doubleValue() : 0.0)
                    .currency(saved.getCurrency())
                    .status(saved.getStatus().name())
                    .build();
            elasticsearchRepository.save(doc);
            log.info("Indexed project {} in Elasticsearch with {} skills", saved.getId(), indexedSkills.size());
        } catch (Exception e) {
            log.warn("Could not index project in Elasticsearch (continuing with DB only): {}", e.getMessage());
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public PageResponse<Project> searchProjectsAdvanced(ProjectSearchCriteria criteria) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(0, criteria.getPage()),
                Math.min(100, Math.max(1, criteria.getSize())),
                ProjectSpecification.sort(criteria)
        );

        Specification<Project> spec = ProjectSpecification.build(criteria);
        Page<Project> pageResult = projectRepository.findAll(spec, pageRequest);
        return PageResponse.from(pageResult);
    }

    @Transactional(readOnly = true)
    public List<Project> searchProjects(String keyword, List<String> skills, String category) {
        // Try Elasticsearch first for full-text search
        try {
            List<ProjectDocument> docs = new ArrayList<>();
            
            if (keyword != null && !keyword.isBlank()) {
                List<ProjectDocument> keywordDocs = elasticsearchRepository.findByTitleContainingOrDescriptionContaining(keyword, keyword);
                String lowerKeyword = keyword.toLowerCase();
                List<String> possibleSkills = List.of(lowerKeyword);
                List<ProjectDocument> skillDocs = elasticsearchRepository.findBySkillsIn(possibleSkills);
                
                Set<ProjectDocument> combinedSet = new HashSet<>();
                combinedSet.addAll(keywordDocs);
                combinedSet.addAll(skillDocs);
                docs = new ArrayList<>(combinedSet);
                
                if (!docs.isEmpty()) {
                    List<String> ids = docs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids).stream()
                            .filter(p -> p.getStatus() == ProjectStatus.OPEN)
                            .collect(Collectors.toList());
                }
            }
            
            if (skills != null && !skills.isEmpty()) {
                List<String> lowerSkills = skills.stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
                List<ProjectDocument> skillDocs = elasticsearchRepository.findBySkillsIn(lowerSkills);
                if (!skillDocs.isEmpty()) {
                    List<String> ids = skillDocs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids).stream()
                            .filter(p -> p.getStatus() == ProjectStatus.OPEN)
                            .collect(Collectors.toList());
                }
            }
            
            if (category != null && !category.isBlank()) {
                List<ProjectDocument> categoryDocs = elasticsearchRepository.findByCategoryIgnoreCase(category);
                if (!categoryDocs.isEmpty()) {
                    List<String> ids = categoryDocs.stream().map(ProjectDocument::getId).collect(Collectors.toList());
                    return projectRepository.findAllById(ids).stream()
                            .filter(p -> p.getStatus() == ProjectStatus.OPEN)
                            .collect(Collectors.toList());
                }
            }
            
            // If no filters provided or no results from Elasticsearch, return all open
            if (keyword == null && (skills == null || skills.isEmpty()) && category == null) {
                return projectRepository.findByStatus(ProjectStatus.OPEN);
            }
            
        } catch (Exception e) {
            log.warn("Elasticsearch search failed, falling back to PostgreSQL: {}", e.getMessage());
        }

        // Graceful fallback to PostgreSQL with combined filtering
        List<Project> results = new ArrayList<>();
        
        if (keyword != null && !keyword.isBlank()) {
            List<Project> keywordResults = projectRepository.searchByKeyword(keyword);
            results.addAll(keywordResults);
            
            String lowerKeyword = keyword.toLowerCase();
            List<Project> skillResults = projectRepository.findBySkillsIn(List.of(lowerKeyword));
            results.addAll(skillResults);
        }
        
        if (skills != null && !skills.isEmpty()) {
            List<String> lowerSkills = skills.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toList());
            List<Project> skillResults = projectRepository.findBySkillsIn(lowerSkills);
            
            if (results.isEmpty()) {
                results.addAll(skillResults);
            } else {
                Set<String> existingIds = results.stream().map(Project::getId).collect(Collectors.toSet());
                results = skillResults.stream()
                    .filter(p -> existingIds.contains(p.getId()))
                    .collect(Collectors.toList());
            }
        }
        
        if (category != null && !category.isBlank()) {
            List<Project> categoryResults = projectRepository.findByCategoryIgnoreCase(category);
            
            if (results.isEmpty()) {
                results.addAll(categoryResults);
            } else {
                Set<String> existingIds = results.stream().map(Project::getId).collect(Collectors.toSet());
                results = categoryResults.stream()
                    .filter(p -> existingIds.contains(p.getId()))
                    .collect(Collectors.toList());
            }
        }
        
        // Remove duplicates and filter to OPEN
        Set<String> seenIds = new HashSet<>();
        List<Project> uniqueResults = new ArrayList<>();
        for (Project project : results) {
            if (project.getStatus() == ProjectStatus.OPEN && seenIds.add(project.getId())) {
                uniqueResults.add(project);
            }
        }
        
        return uniqueResults;
    }

    @CacheEvict(value = {"projects", "recommendations"}, allEntries = true)
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

    @CacheEvict(value = {"projects", "recommendations"}, allEntries = true)
    @Transactional
    public Project updateProject(String id, String title, String description,
                                 String category, BigDecimal budget, String currency,
                                 Set<String> requiredSkills, String status) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        if (title != null || description != null || category != null || budget != null || currency != null || requiredSkills != null) {
            throw new IllegalStateException("Projects cannot be edited once created.");
        }
        if (status != null && !status.isBlank()) {
            try {
                project.setStatus(ProjectStatus.valueOf(status.toUpperCase()));
            } catch (Exception ignored) {}
        }

        Project updated = projectRepository.save(project);
        log.info("Updated project: {} ({})", updated.getTitle(), updated.getId());

        try {
            List<String> indexedSkills = updated.getRequiredSkills() != null
                    ? updated.getRequiredSkills().stream().map(String::toLowerCase).collect(Collectors.toList())
                    : new ArrayList<>();

            ProjectDocument doc = ProjectDocument.builder()
                    .id(updated.getId())
                    .startupId(updated.getStartupId())
                    .title(updated.getTitle())
                    .description(updated.getDescription())
                    .category(updated.getCategory())
                    .skills(indexedSkills)
                    .budget(updated.getBudget() != null ? updated.getBudget().doubleValue() : 0.0)
                    .currency(updated.getCurrency())
                    .status(updated.getStatus().name())
                    .build();
            elasticsearchRepository.save(doc);
        } catch (Exception e) {
            log.warn("Could not update project in Elasticsearch: {}", e.getMessage());
        }

        return updated;
    }

    @CacheEvict(value = {"projects", "recommendations"}, allEntries = true)
    @Transactional
    public void deleteProject(String id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));

        projectRepository.delete(project);
        log.info("Deleted project: {}", id);

        try {
            elasticsearchRepository.deleteById(id);
        } catch (Exception e) {
            log.warn("Could not delete project from Elasticsearch: {}", e.getMessage());
        }
    }
}
