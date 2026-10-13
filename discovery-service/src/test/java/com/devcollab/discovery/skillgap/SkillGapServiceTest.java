package com.devcollab.discovery.skillgap;

import com.devcollab.discovery.entity.MatchRecord;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.MatchRecordRepository;
import com.devcollab.discovery.repository.ProjectRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class SkillGapServiceTest {
    @Mock private StudentProfileRepository studentRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private MatchRecordRepository matchRepository;

    private SkillGapService service;
    private StudentProfile student;
    private Project project;

    @BeforeEach
    void setUp() {
        service = new SkillGapService(studentRepository, projectRepository, matchRepository, new CourseRecommendationService(new CourseCatalog()));
        student = StudentProfile.builder().id("student-001").userId("user-001").fullName("Alex").skills(Set.of(" Python ", "MongoDB", "ReactJS")).build();
        project = Project.builder().id("project-001").startupId("startup-001").title("AI Logistics API").description("API").category("Backend").budget(BigDecimal.ONE).requiredSkills(Set.of("Python", "FastAPI", "MongoDB", "Docker")).build();
        lenient().when(studentRepository.findById("student-001")).thenReturn(Optional.of(student));
        lenient().when(projectRepository.findById("project-001")).thenReturn(Optional.of(project));
    }

    @Test
    void calculatesPartialCoverageAndExplanations() {
        var result = service.analyze("student-001", "project-001");

        assertEquals(0.5, result.coverage());
        assertEquals(SkillGapTypes.Severity.MEDIUM, result.severity());
        assertEquals(Set.of("FastAPI", "Docker"), Set.copyOf(result.missingSkills()));
        assertEquals(4, result.recommendations().size());
        assertEquals("Missing FastAPI because project 'AI Logistics API' requires FastAPI.", result.explanations().stream().filter(text -> text.contains("FastAPI")).findFirst().orElseThrow());
    }

    @Test
    void normalizesAliasesAndWhitespace() {
        assertEquals("node.js", SkillGapService.normalizeSkill(" NODEJS "));
        assertEquals("react", SkillGapService.normalizeSkill("ReactJS"));
        assertEquals("postgresql", SkillGapService.normalizeSkill("postgres"));
        assertEquals("github actions", SkillGapService.normalizeSkill("gh-actions"));
    }

    @Test
    void returnsPerfectMatchForEmptyRequirements() {
        project.setRequiredSkills(Set.of());

        var result = service.analyze("student-001", "project-001");

        assertEquals(1.0, result.coverage());
        assertEquals(SkillGapTypes.Severity.NONE, result.severity());
        assertEquals(0, result.recommendations().size());
    }

    @Test
    void classifiesAllSeverityBoundariesWithoutFloatingPointComparisons() {
        project.setRequiredSkills(Set.of("one", "two", "three", "four"));

        student.setSkills(Set.of());
        assertEquals(SkillGapTypes.Severity.CRITICAL, service.analyze("student-001", "project-001").severity());

        student.setSkills(Set.of("one"));
        assertEquals(SkillGapTypes.Severity.HIGH, service.analyze("student-001", "project-001").severity());

        student.setSkills(Set.of("one", "two"));
        assertEquals(SkillGapTypes.Severity.MEDIUM, service.analyze("student-001", "project-001").severity());

        student.setSkills(Set.of("one", "two", "three"));
        assertEquals(SkillGapTypes.Severity.LOW, service.analyze("student-001", "project-001").severity());

        student.setSkills(Set.of("one", "two", "three", "four"));
        assertEquals(SkillGapTypes.Severity.NONE, service.analyze("student-001", "project-001").severity());
    }

    @Test
    void removesDuplicateAndWhitespacePaddedRequirementsAfterNormalization() {
        project.setRequiredSkills(Set.of(" Docker ", "Docker", "COBOL"));
        student.setSkills(Set.of("docker"));

        var result = service.analyze("student-001", "project-001");

        assertEquals(2, result.requiredSkills().size());
        assertEquals(0.5, result.coverage());
        assertEquals(1, result.matchedSkills().size());
        assertEquals("docker", SkillGapService.normalizeSkill(result.matchedSkills().get(0)));
        assertEquals(Set.of("COBOL"), Set.copyOf(result.missingSkills()));
        assertTrue(result.recommendations().isEmpty());
    }

    @Test
    void treatsNullSkillCollectionsAsEmptyCollections() {
        student.setSkills(null);
        project.setRequiredSkills(null);

        var result = service.analyze("student-001", "project-001");

        assertEquals(1.0, result.coverage());
        assertEquals(SkillGapTypes.Severity.NONE, result.severity());
        assertTrue(result.studentSkills().isEmpty());
        assertTrue(result.requiredSkills().isEmpty());
    }

    @Test
    void reportsMissingStudentAndProject() {
        given(studentRepository.findById("missing")).willReturn(Optional.empty());
        given(studentRepository.findByUserId("missing")).willReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.analyze("missing", "project-001"));

        given(studentRepository.findById("student-001")).willReturn(Optional.of(student));
        given(projectRepository.findById("missing")).willReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.analyze("student-001", "missing"));
    }

    @Test
    void rejectedAndBelowFiftyMatchesAreAnalyzedButExactlyFiftyIsNot() {
        MatchRecord rejected = MatchRecord.builder().id("match-001").studentId("student-001").projectId("project-001").status("REJECTED").matchScore(50.0).build();
        given(matchRepository.findById("match-001")).willReturn(Optional.of(rejected));
        assertEquals(service.analyze("student-001", "project-001"), service.analyzeFailedMatch("match-001"));

        MatchRecord exactFifty = MatchRecord.builder().id("match-002").studentId("student-001").projectId("project-001").status("ACCEPTED").matchScore(50.0).build();
        given(matchRepository.findById("match-002")).willReturn(Optional.of(exactFifty));
        assertThrows(IllegalArgumentException.class, () -> service.analyzeFailedMatch("match-002"));
    }
}