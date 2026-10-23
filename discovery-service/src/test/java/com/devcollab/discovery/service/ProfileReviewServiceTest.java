package com.devcollab.discovery.service;

import com.devcollab.discovery.dto.CreateReviewDto;
import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ReviewSummaryDto;
import com.devcollab.discovery.entity.ProfileReview;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.ProfileReviewRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProfileReviewServiceTest {

    @Mock
    private ProfileReviewRepository profileReviewRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private ProfileReviewService profileReviewService;

    private StudentProfile sampleStudent;
    private ProfileReview sampleReview;

    @BeforeEach
    void setUp() {
        sampleStudent = StudentProfile.builder()
                .id("student-123")
                .userId("user-123")
                .fullName("Jane Doe")
                .rating(0.0)
                .reviewCount(0)
                .hourlyRate(BigDecimal.valueOf(45.00))
                .build();

        sampleReview = ProfileReview.builder()
                .id("review-001")
                .studentId("student-123")
                .reviewerId("client-456")
                .reviewerName("Acme Corp")
                .rating(5)
                .title("Top quality delivery")
                .comment("Delivered the project ahead of schedule.")
                .build();
    }

    @Test
    void testAddReviewSavesReviewAndRecalculatesRating() {
        given(studentProfileRepository.findById("student-123")).willReturn(Optional.of(sampleStudent));
        given(profileReviewRepository.save(any(ProfileReview.class))).willReturn(sampleReview);
        given(profileReviewRepository.getAverageRating("student-123")).willReturn(5.0);
        given(profileReviewRepository.countByStudentId("student-123")).willReturn(1L);

        CreateReviewDto dto = CreateReviewDto.builder()
                .reviewerId("client-456")
                .reviewerName("Acme Corp")
                .rating(5)
                .title("Top quality delivery")
                .comment("Delivered the project ahead of schedule.")
                .build();

        ProfileReview result = profileReviewService.addReview("student-123", dto);

        assertNotNull(result);
        assertEquals("review-001", result.getId());
        assertEquals(5, result.getRating());
        verify(studentProfileRepository).save(sampleStudent);
        assertEquals(5.0, sampleStudent.getRating());
        assertEquals(1, sampleStudent.getReviewCount());
    }

    @Test
    void testGetReviewsForStudentReturnsPagedResults() {
        Page<ProfileReview> page = new PageImpl<>(List.of(sampleReview));
        given(studentProfileRepository.findByUserId("student-123")).willReturn(Optional.empty());
        given(profileReviewRepository.findByStudentId(any(String.class), any(Pageable.class))).willReturn(page);

        PageResponse<ProfileReview> response = profileReviewService.getReviewsForStudent("student-123", 0, 10);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("review-001", response.getContent().get(0).getId());
    }

    @Test
    void testGetReviewSummaryCalculatesBreakdown() {
        given(studentProfileRepository.findByUserId("student-123")).willReturn(Optional.empty());
        given(profileReviewRepository.getAverageRating("student-123")).willReturn(4.67);
        given(profileReviewRepository.countByStudentId("student-123")).willReturn(3L);

        List<Object[]> distribution = List.of(
                new Object[]{5, 2L},
                new Object[]{4, 1L}
        );
        given(profileReviewRepository.getRatingDistribution("student-123")).willReturn(distribution);

        ReviewSummaryDto summary = profileReviewService.getReviewSummary("student-123");

        assertNotNull(summary);
        assertEquals(4.67, summary.getAverageRating());
        assertEquals(3L, summary.getTotalReviews());
        assertEquals(2L, summary.getRatingDistribution().get(5));
        assertEquals(1L, summary.getRatingDistribution().get(4));
        assertEquals(0L, summary.getRatingDistribution().get(1));
    }

    @Test
    void testDeleteReviewDeletesAndRecalculates() {
        given(profileReviewRepository.findById("review-001")).willReturn(Optional.of(sampleReview));
        given(studentProfileRepository.findById("student-123")).willReturn(Optional.of(sampleStudent));
        given(profileReviewRepository.getAverageRating("student-123")).willReturn(null);
        given(profileReviewRepository.countByStudentId("student-123")).willReturn(0L);

        profileReviewService.deleteReview("review-001");

        verify(profileReviewRepository).delete(sampleReview);
        verify(studentProfileRepository).save(sampleStudent);
        assertEquals(0.0, sampleStudent.getRating());
        assertEquals(0, sampleStudent.getReviewCount());
    }
}

