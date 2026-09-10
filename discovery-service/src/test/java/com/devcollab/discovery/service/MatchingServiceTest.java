package com.devcollab.discovery.service;

import com.devcollab.discovery.entity.MatchRecord;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.MatchRecordRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private MatchRecordRepository matchRecordRepository;

    @Mock
    private ProjectMatchedEventPublisher eventPublisher;

    @InjectMocks
    private MatchingService matchingService;

    private Project sampleProject;
    private StudentProfile sampleStudent;

    @BeforeEach
    void setUp() {
        sampleProject = Project.builder()
                .id("proj-123")
                .startupId("startup-abc")
                .title("React Dashboard")
                .description("Build a modern dashboard")
                .category("Web Development")
                .budget(BigDecimal.valueOf(1500))
                .currency("USD")
                .status(ProjectStatus.OPEN)
                .requiredSkills(Set.of("React", "TypeScript", "Node.js"))
                .build();

        sampleStudent = StudentProfile.builder()
                .id("student-456")
                .userId("user-789")
                .fullName("Alex Chen")
                .skills(Set.of("React", "TypeScript", "Python"))
                .rating(4.9)
                .build();
    }

    @Test
    void testGetRecommendationsCalculatesSkillOverlap() {
        given(studentProfileRepository.findById("student-456")).willReturn(Optional.of(sampleStudent));
        given(projectRepository.findByStatus(ProjectStatus.OPEN)).willReturn(List.of(sampleProject));

        List<MatchingService.ProjectRecommendation> recs = matchingService.getRecommendations("student-456");

        assertNotNull(recs);
        assertEquals(1, recs.size());
        assertTrue(recs.get(0).getMatchScore() > 0);
        assertTrue(recs.get(0).getMatchingSkills().contains("react") || recs.get(0).getMatchingSkills().contains("typescript"));
    }

    @Test
    void testMatchProjectSavesMatchAndPublishesEvent() {
        given(projectRepository.findById("proj-123")).willReturn(Optional.of(sampleProject));
        given(studentProfileRepository.findById("student-456")).willReturn(Optional.of(sampleStudent));
        given(matchRecordRepository.findByProjectIdAndStudentId("proj-123", "student-456")).willReturn(Optional.empty());
        given(matchRecordRepository.save(any(MatchRecord.class))).willAnswer(inv -> inv.getArgument(0));

        MatchingService.MatchResult result = matchingService.matchProject("proj-123", "student-456");

        assertNotNull(result);
        assertEquals("proj-123", result.getProjectId());
        assertEquals("MATCHED", result.getStatus());
        assertEquals(ProjectStatus.MATCHED, sampleProject.getStatus());
        verify(eventPublisher).publishProjectMatched(sampleProject, "student-456");
    }
}
