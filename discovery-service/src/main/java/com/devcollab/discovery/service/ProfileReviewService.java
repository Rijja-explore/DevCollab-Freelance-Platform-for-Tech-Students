package com.devcollab.discovery.service;

import com.devcollab.discovery.dto.CreateReviewDto;
import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ReviewSummaryDto;
import com.devcollab.discovery.entity.ProfileReview;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.ProfileReviewRepository;
import com.devcollab.discovery.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileReviewService {

    private final ProfileReviewRepository profileReviewRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Transactional
    @CacheEvict(value = "recommendations", allEntries = true)
    public ProfileReview addReview(String studentId, CreateReviewDto dto) {
        log.info("Adding review for student: {} by reviewer: {}", studentId, dto.getReviewerId());

        StudentProfile student = studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found: " + studentId));

        String reviewerId = dto.getReviewerId().trim();
        if (reviewerId.equals(student.getId()) || reviewerId.equals(student.getUserId())) {
            throw new IllegalArgumentException("You cannot review your own profile");
        }

        String projectId = (dto.getProjectId() != null && !dto.getProjectId().isBlank()) ? dto.getProjectId().trim() : null;
        boolean duplicate = projectId == null
                ? profileReviewRepository.existsByStudentIdAndReviewerIdAndProjectIdIsNull(student.getId(), reviewerId)
                : profileReviewRepository.existsByStudentIdAndReviewerIdAndProjectId(student.getId(), reviewerId, projectId);
        if (duplicate) {
            throw new IllegalStateException(projectId == null
                    ? "You have already reviewed this student"
                    : "You have already reviewed this student for this project");
        }

        ProfileReview review = ProfileReview.builder()
                .studentId(student.getId())
                .reviewerId(reviewerId)
                .reviewerName(dto.getReviewerName().trim())
                .projectId(projectId)
                .rating(dto.getRating())
                .title(dto.getTitle())
                .comment(dto.getComment())
                .build();

        ProfileReview saved = profileReviewRepository.save(review);

        // Recalculate and update student rating & review count
        recalculateStudentRating(student.getId());

        return saved;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProfileReview> getReviewsForStudent(String studentId, int page, int size) {
        String resolvedStudentId = resolveStudentId(studentId);

        PageRequest pageRequest = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by("createdAt").descending());
        Page<ProfileReview> reviewPage = profileReviewRepository.findByStudentId(resolvedStudentId, pageRequest);
        return PageResponse.from(reviewPage);
    }

    @Transactional(readOnly = true)
    public ReviewSummaryDto getReviewSummary(String studentId) {
        String resolvedStudentId = resolveStudentId(studentId);

        Double avg = profileReviewRepository.getAverageRating(resolvedStudentId);
        Long count = profileReviewRepository.countByStudentId(resolvedStudentId);

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0L);
        }

        List<Object[]> rows = profileReviewRepository.getRatingDistribution(resolvedStudentId);
        if (rows != null) {
            for (Object[] row : rows) {
                if (row.length >= 2 && row[0] instanceof Number ratingNum && row[1] instanceof Number countNum) {
                    distribution.put(ratingNum.intValue(), countNum.longValue());
                }
            }
        }

        double finalAvg = avg != null ? BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP).doubleValue() : 0.0;
        long total = count != null ? count : 0L;

        return ReviewSummaryDto.builder()
                .studentId(resolvedStudentId)
                .averageRating(finalAvg)
                .totalReviews(total)
                .ratingDistribution(distribution)
                .build();
    }

    @Transactional
    @CacheEvict(value = "recommendations", allEntries = true)
    public void deleteReview(String reviewId) {
        ProfileReview review = profileReviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found: " + reviewId));
        String studentId = review.getStudentId();
        profileReviewRepository.delete(review);
        recalculateStudentRating(studentId);
    }

    /** Accepts either the profile id or the owning user id. */
    private String resolveStudentId(String studentId) {
        return studentProfileRepository.findById(studentId)
                .or(() -> studentProfileRepository.findByUserId(studentId))
                .map(StudentProfile::getId)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found: " + studentId));
    }

    private void recalculateStudentRating(String studentId) {
        Double avg = profileReviewRepository.getAverageRating(studentId);
        Long count = profileReviewRepository.countByStudentId(studentId);

        studentProfileRepository.findById(studentId).ifPresent(student -> {
            if (avg != null && count != null && count > 0) {
                student.setRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP).doubleValue());
                student.setReviewCount(count.intValue());
            } else {
                student.setRating(0.0);
                student.setReviewCount(0);
            }
            studentProfileRepository.save(student);
            log.info("Updated student {} rating to {} based on {} reviews", studentId, student.getRating(), student.getReviewCount());
        });
    }
}

