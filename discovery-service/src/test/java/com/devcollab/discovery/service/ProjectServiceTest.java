package com.devcollab.discovery.service;

import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ProjectSearchCriteria;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.repository.ProjectElasticsearchRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectElasticsearchRepository elasticsearchRepository;

    @InjectMocks
    private ProjectService projectService;

    private Project testProject;

    @BeforeEach
    void setUp() {
        testProject = Project.builder()
                .id("proj-001")
                .startupId("startup-001")
                .title("Fullstack Web Platform")
                .description("Build with React and Spring Boot")
                .category("Web Development")
                .budget(BigDecimal.valueOf(2000))
                .currency("USD")
                .status(ProjectStatus.OPEN)
                .requiredSkills(Set.of("Java", "React"))
                .build();
    }

    @Test
    void testGetProjectByIdReturnsProject() {
        given(projectRepository.findById("proj-001")).willReturn(Optional.of(testProject));

        Optional<Project> found = projectService.getProjectById("proj-001");

        assertTrue(found.isPresent());
        assertEquals("Fullstack Web Platform", found.get().getTitle());
    }

    @Test
    void testCreateProjectPersistsAndIndexes() {
        given(projectRepository.save(any(Project.class))).willAnswer(inv -> inv.getArgument(0));

        Project created = projectService.createProject(
                "startup-001",
                "New Project",
                "A description",
                "Mobile",
                BigDecimal.valueOf(1200),
                "USD",
                Set.of("Flutter")
        );

        assertNotNull(created);
        assertEquals("New Project", created.getTitle());
        assertEquals("USD", created.getCurrency());
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void testSearchFallbackToDatabase() {
        given(elasticsearchRepository.findByTitleContainingOrDescriptionContaining("React", "React"))
                .willReturn(List.of());
        given(projectRepository.searchByKeyword("React"))
                .willReturn(List.of(testProject));

        List<Project> results = projectService.searchProjects("React", null, null);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Fullstack Web Platform", results.get(0).getTitle());
    }

    @Test
    void testSearchProjectsAdvancedExecutesSpecification() {
        Page<Project> page = new PageImpl<>(List.of(testProject));
        given(projectRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(page);

        ProjectSearchCriteria criteria = ProjectSearchCriteria.builder()
                .keyword("Web")
                .category("Web Development")
                .minBudget(BigDecimal.valueOf(1000))
                .maxBudget(BigDecimal.valueOf(3000))
                .build();

        PageResponse<Project> response = projectService.searchProjectsAdvanced(criteria);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Fullstack Web Platform", response.getContent().get(0).getTitle());
        assertEquals(1, response.getTotalElements());
    }
}
