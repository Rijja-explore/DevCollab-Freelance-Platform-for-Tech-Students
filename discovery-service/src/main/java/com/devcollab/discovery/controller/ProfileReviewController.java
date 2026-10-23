package com.devcollab.discovery.controller;

import com.devcollab.discovery.dto.CreateReviewDto;
import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.ReviewSummaryDto;
import com.devcollab.discovery.entity.ProfileReview;
import com.devcollab.discovery.service.ProfileReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profiles/students")
@RequiredArgsConstructor
public class ProfileReviewController {

    private final ProfileReviewService profileReviewService;

    @PostMapping("/{studentId}/reviews")
    public ResponseEntity<Map<String, Object>> addReview(
            @PathVariable String studentId,
            @Valid @RequestBody CreateReviewDto dto) {
        ProfileReview review = profileReviewService.addReview(studentId, dto);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", review);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{studentId}/reviews")
    public ResponseEntity<Map<String, Object>> getReviews(
            @PathVariable String studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<ProfileReview> reviews = profileReviewService.getReviewsForStudent(studentId, page, size);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", reviews.getContent());
        response.put("page", reviews.getPage());
        response.put("size", reviews.getSize());
        response.put("totalElements", reviews.getTotalElements());
        response.put("totalPages", reviews.getTotalPages());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{studentId}/reviews/summary")
    public ResponseEntity<Map<String, Object>> getReviewSummary(@PathVariable String studentId) {
        ReviewSummaryDto summary = profileReviewService.getReviewSummary(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", summary);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Map<String, Object>> deleteReview(@PathVariable String reviewId) {
        profileReviewService.deleteReview(reviewId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Review deleted successfully");
        return ResponseEntity.ok(response);
    }
}

