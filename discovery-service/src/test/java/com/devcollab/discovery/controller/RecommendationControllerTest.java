package com.devcollab.discovery.controller;

import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.service.MatchingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecommendationController.class)
@AutoConfigureMockMvc(addFilters = false)
class RecommendationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MatchingService matchingService;

    @Test
    void testGetCandidateRecommendationsForProject() throws Exception {
        StudentProfile student = StudentProfile.builder()
                .id("student-1")
                .fullName("Dev Alice")
                .rating(4.9)
                .build();

        MatchingService.CandidateRecommendation rec = MatchingService.CandidateRecommendation.builder()
                .student(student)
                .matchScore(92.5)
                .matchingSkills(List.of("React", "TypeScript"))
                .missingSkills(List.of())
                .fitReason("92.5% match")
                .build();

        given(matchingService.getRecommendedCandidatesForProject("proj-1", 10))
                .willReturn(List.of(rec));

        mockMvc.perform(get("/api/recommendations/projects/proj-1/candidates?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.data[0].matchScore").value(92.5))
                .andExpect(jsonPath("$.data[0].student.fullName").value("Dev Alice"));
    }

    @Test
    void testGetSimilarProjects() throws Exception {
        Project proj = Project.builder()
                .id("proj-2")
                .title("Similar React App")
                .build();

        MatchingService.SimilarProjectRecommendation rec = MatchingService.SimilarProjectRecommendation.builder()
                .project(proj)
                .similarityScore(88.0)
                .sharedSkills(List.of("React"))
                .build();

        given(matchingService.getSimilarProjects("proj-1", 6))
                .willReturn(List.of(rec));

        mockMvc.perform(get("/api/recommendations/projects/proj-1/similar?limit=6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].similarityScore").value(88.0));
    }
}

