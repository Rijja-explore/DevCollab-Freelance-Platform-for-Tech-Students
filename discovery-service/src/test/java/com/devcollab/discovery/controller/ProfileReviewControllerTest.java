package com.devcollab.discovery.controller;

import com.devcollab.discovery.dto.CreateReviewDto;
import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ReviewSummaryDto;
import com.devcollab.discovery.entity.ProfileReview;
import com.devcollab.discovery.service.ProfileReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfileReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProfileReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProfileReviewService profileReviewService;

    @Test
    void testAddReviewReturnsCreated() throws Exception {
        CreateReviewDto dto = CreateReviewDto.builder()
                .reviewerId("rev-123")
                .reviewerName("Test Client")
                .rating(5)
                .title("Excellent work")
                .comment("Very good communication")
                .build();

        ProfileReview created = ProfileReview.builder()
                .id("rev-id-1")
                .studentId("student-123")
                .reviewerId("rev-123")
                .reviewerName("Test Client")
                .rating(5)
                .title("Excellent work")
                .comment("Very good communication")
                .build();

        given(profileReviewService.addReview(eq("student-123"), any(CreateReviewDto.class)))
                .willReturn(created);

        mockMvc.perform(post("/api/profiles/students/student-123/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rating").value(5))
                .andExpect(jsonPath("$.data.id").value("rev-id-1"));
    }

    @Test
    void testGetReviewsReturnsList() throws Exception {
        ProfileReview review = ProfileReview.builder()
                .id("rev-id-1")
                .studentId("student-123")
                .rating(5)
                .build();

        PageResponse<ProfileReview> response = PageResponse.<ProfileReview>builder()
                .content(List.of(review))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();

        given(profileReviewService.getReviewsForStudent("student-123", 0, 10))
                .willReturn(response);

        mockMvc.perform(get("/api/profiles/students/student-123/reviews?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("rev-id-1"));
    }

    @Test
    void testGetReviewSummaryReturnsSummary() throws Exception {
        ReviewSummaryDto summary = ReviewSummaryDto.builder()
                .studentId("student-123")
                .averageRating(4.8)
                .totalReviews(5L)
                .ratingDistribution(Map.of(5, 4L, 4, 1L))
                .build();

        given(profileReviewService.getReviewSummary("student-123"))
                .willReturn(summary);

        mockMvc.perform(get("/api/profiles/students/student-123/reviews/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.averageRating").value(4.8))
                .andExpect(jsonPath("$.data.totalReviews").value(5));
    }
}

