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
                .reviewCount(5)
                .hourlyRate(BigDecimal.valueOf(40.00))
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
        assertNotNull(recs.get(0).getFitReason());
    }

    @Test
    void testGetRecommendedCandidatesForProjectRanksCandidates() {
        StudentProfile junior = StudentProfile.builder()
                .id("student-999")
                .userId("user-999")
                .fullName("Junior Dev")
                .skills(Set.of("HTML", "CSS"))
                .rating(3.5)
                .reviewCount(1)
                .hourlyRate(BigDecimal.valueOf(25.00))
                .build();

        given(projectRepository.findById("proj-123")).willReturn(Optional.of(sampleProject));
        given(studentProfileRepository.findAll()).willReturn(List.of(sampleStudent, junior));

        List<MatchingService.CandidateRecommendation> candidates =
                matchingService.getRecommendedCandidatesForProject("proj-123", 10);

        assertNotNull(candidates);
        assertEquals(2, candidates.size());
        // Alex Chen has higher skill overlap (React, TypeScript) and rating
        assertEquals("student-456", candidates.get(0).getStudent().getId());
        assertTrue(candidates.get(0).getMatchScore() > candidates.get(1).getMatchScore());
        assertTrue(candidates.get(0).getMatchingSkills().contains("react"));
    }

    @Test
    void testGetSimilarProjectsFindsMatchingCategoriesAndSkills() {
        Project similarProject = Project.builder()
                .id("proj-999")
                .title("Next.js Portal")
                .category("Web Development")
                .status(ProjectStatus.OPEN)
                .requiredSkills(Set.of("React", "TypeScript"))
                .build();

        Project otherProject = Project.builder()
                .id("proj-000")
                .title("Embedded C Controller")
                .category("IoT")
                .status(ProjectStatus.OPEN)
                .requiredSkills(Set.of("C", "Assembly"))
                .build();

        given(projectRepository.findById("proj-123")).willReturn(Optional.of(sampleProject));
        given(projectRepository.findByStatus(ProjectStatus.OPEN)).willReturn(List.of(sampleProject, similarProject, otherProject));

        List<MatchingService.SimilarProjectRecommendation> similar = matchingService.getSimilarProjects("proj-123", 5);

        assertNotNull(similar);
        assertEquals(2, similar.size());
        assertEquals("proj-999", similar.get(0).getProject().getId());
        assertTrue(similar.get(0).getSimilarityScore() > similar.get(1).getSimilarityScore());
        assertTrue(similar.get(0).getSharedSkills().contains("react"));
    }

    @Test
    void testGetSimilarStudentsMatchesPeerSkillsAndRate() {
        StudentProfile peerStudent = StudentProfile.builder()
                .id("student-peer")
                .fullName("Sarah Jones")
                .skills(Set.of("React", "TypeScript", "Node.js"))
                .hourlyRate(BigDecimal.valueOf(42.00))
                .build();

        StudentProfile differentStudent = StudentProfile.builder()
                .id("student-diff")
                .fullName("Bob Mobile")
                .skills(Set.of("Swift", "iOS"))
                .hourlyRate(BigDecimal.valueOf(80.00))
                .build();

        given(studentProfileRepository.findById("student-456")).willReturn(Optional.of(sampleStudent));
        given(studentProfileRepository.findAll()).willReturn(List.of(sampleStudent, peerStudent, differentStudent));

        List<MatchingService.SimilarStudentRecommendation> similar = matchingService.getSimilarStudents("student-456", 5);

        assertNotNull(similar);
        assertEquals(2, similar.size());
        assertEquals("student-peer", similar.get(0).getStudent().getId());
        assertTrue(similar.get(0).getSimilarityScore() > similar.get(1).getSimilarityScore());
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
