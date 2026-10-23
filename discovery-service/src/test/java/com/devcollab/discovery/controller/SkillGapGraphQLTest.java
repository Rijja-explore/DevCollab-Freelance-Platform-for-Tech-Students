package com.devcollab.discovery.controller;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.devcollab.discovery.auth.JwtTokenService;
import com.devcollab.discovery.repository.StudentProfileRepository;
import com.devcollab.discovery.service.MatchingService;
import com.devcollab.discovery.service.ProfileReviewService;
import com.devcollab.discovery.service.ProjectService;
import com.devcollab.discovery.skillgap.SkillGapService;
import com.devcollab.discovery.skillgap.SkillGapTypes.SkillGapAnalysis;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.graphql.test.tester.GraphQlTester;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@GraphQlTest(ProjectGraphQLController.class)
class SkillGapGraphQLTest {
    @Autowired
    private GraphQlTester graphQlTester;

    @MockBean private ProjectService projectService;
    @MockBean private MatchingService matchingService;
    @MockBean private StudentProfileRepository studentProfileRepository;
    @MockBean private ProfileReviewService profileReviewService;
    @MockBean private SkillGapService skillGapService;
    @MockBean private JwtTokenService jwtTokenService;
    @MockBean private HttpServletRequest request;

    @Test
    void exposesSkillGapFieldsAndUsesBearerAuthentication() {
        DecodedJWT jwt = mock(DecodedJWT.class);
        var roleClaim = mock(com.auth0.jwt.interfaces.Claim.class);
        given(request.getHeader("Authorization")).willReturn("Bearer valid-token");
        given(jwtTokenService.verifyToken("valid-token")).willReturn(jwt);
        given(jwt.getClaim("role")).willReturn(roleClaim);
        given(roleClaim.asString()).willReturn("STUDENT");
        given(jwt.getSubject()).willReturn("student-001");
        given(skillGapService.analyze("student-001", "project-001")).willReturn(
                new SkillGapAnalysis("student-001", "project-001", "AI Logistics API",
                        List.of("Python"), List.of("Python", "FastAPI"), List.of("Python"), List.of("FastAPI"),
                        0.5, com.devcollab.discovery.skillgap.SkillGapTypes.Severity.MEDIUM,
                        List.of("Missing FastAPI because project 'AI Logistics API' requires FastAPI."), List.of()));

        graphQlTester.document("""
                query { analyzeMySkillGap(projectId: \"project-001\") {
                    studentId projectId projectTitle coverage severity missingSkills
                }}
                """)
                .execute()
                .path("analyzeMySkillGap.projectTitle").entity(String.class).isEqualTo("AI Logistics API")
                .path("analyzeMySkillGap.coverage").entity(Double.class).isEqualTo(0.5)
                .path("analyzeMySkillGap.missingSkills[0]").entity(String.class).isEqualTo("FastAPI");
    }

    @Test
    void rejectsAnalyzeMySkillGapWithoutBearerToken() {
        given(request.getHeader("Authorization")).willReturn(null);

        graphQlTester.document("{ analyzeMySkillGap(projectId: \"project-001\") { projectId } }")
                .execute()
                .errors()
                .satisfy(errors -> assertFalse(errors.isEmpty()));
    }
}
