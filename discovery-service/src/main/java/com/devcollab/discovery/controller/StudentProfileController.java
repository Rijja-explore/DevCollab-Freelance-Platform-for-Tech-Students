package com.devcollab.discovery.controller;

import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.StudentSearchCriteria;
import com.devcollab.discovery.dto.UpdateStudentProfileDto;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import com.devcollab.discovery.specification.StudentProfileSpecification;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/profiles/students")
@RequiredArgsConstructor
public class StudentProfileController {

    static final Set<String> AVAILABILITY_VALUES = Set.of("AVAILABLE", "PART_TIME", "UNAVAILABLE");

    private final StudentProfileRepository studentProfileRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProfiles() {
        List<StudentProfile> list = studentProfileRepository.findAll();
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", list);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String id) {
        return studentProfileRepository.findById(id)
                .or(() -> studentProfileRepository.findByUserId(id))
                .map(profile -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("data", profile);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "error", "Student profile not found")));
    }

    /**
     * Talent search. Kept for backward compatibility with older clients; it now runs
     * through the same specification as /advanced-search so all filters apply.
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBySkills(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Double maxRating,
            @RequestParam(required = false) BigDecimal minHourlyRate,
            @RequestParam(required = false) BigDecimal maxHourlyRate,
            @RequestParam(required = false) Boolean allSkills,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) List<String> availability,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "rating") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        return advancedSearch(null, q, skills, allSkills, minRating, maxRating, minHourlyRate, maxHourlyRate,
                location, availability, page, size, sortBy, sortDirection);
    }

    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearch(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) Boolean allSkills,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Double maxRating,
            @RequestParam(required = false) BigDecimal minHourlyRate,
            @RequestParam(required = false) BigDecimal maxHourlyRate,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) List<String> availability,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "rating") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        String kw = (keyword != null && !keyword.isBlank()) ? keyword : q;
        StudentSearchCriteria criteria = StudentSearchCriteria.builder()
                .keyword(kw)
                .skills(skills)
                .allSkills(allSkills)
                .minRating(minRating)
                .maxRating(maxRating)
                .minHourlyRate(minHourlyRate)
                .maxHourlyRate(maxHourlyRate)
                .location(location)
                .availability(availability)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        return runSearch(criteria);
    }

    @PostMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchPost(
            @RequestBody StudentSearchCriteria criteria) {
        return runSearch(criteria);
    }

    private ResponseEntity<Map<String, Object>> runSearch(StudentSearchCriteria criteria) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(0, criteria.getPage()),
                Math.min(100, Math.max(1, criteria.getSize())),
                StudentProfileSpecification.sort(criteria)
        );

        Specification<StudentProfile> spec = StudentProfileSpecification.build(criteria);
        Page<StudentProfile> pageResult = studentProfileRepository.findAll(spec, pageRequest);
        PageResponse<StudentProfile> responsePage = PageResponse.from(pageResult);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", responsePage.getContent());
        res.put("count", responsePage.getContent().size());
        res.put("page", responsePage.getPage());
        res.put("size", responsePage.getSize());
        res.put("totalElements", responsePage.getTotalElements());
        res.put("totalPages", responsePage.getTotalPages());
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProfile(@RequestBody StudentProfile profile) {
        validateAvailability(profile.getAvailability());
        // Ratings are derived from reviews and cannot be set by the client
        profile.setRating(0.0);
        profile.setReviewCount(0);
        StudentProfile saved = studentProfileRepository.save(profile);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable String id,
            @Valid @RequestBody UpdateStudentProfileDto profile) {
        validateAvailability(profile.getAvailability());
        return studentProfileRepository.findById(id)
                .or(() -> studentProfileRepository.findByUserId(id))
                .map(existing -> {
                    if (profile.getFullName() != null) existing.setFullName(profile.getFullName());
                    if (profile.getHeadline() != null) existing.setHeadline(profile.getHeadline());
                    if (profile.getBio() != null) existing.setBio(profile.getBio());
                    if (profile.getHourlyRate() != null) existing.setHourlyRate(profile.getHourlyRate());
                    if (profile.getSkills() != null) existing.setSkills(profile.getSkills());
                    if (profile.getLocation() != null) existing.setLocation(profile.getLocation().trim());
                    if (profile.getAvailability() != null) existing.setAvailability(profile.getAvailability().trim().toUpperCase());
                    StudentProfile updated = studentProfileRepository.save(existing);
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("data", updated);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "error", "Student profile not found")));
    }

    private void validateAvailability(String availability) {
        if (availability != null && !AVAILABILITY_VALUES.contains(availability.trim().toUpperCase())) {
            throw new IllegalArgumentException("availability must be one of " + AVAILABILITY_VALUES);
        }
    }
}
