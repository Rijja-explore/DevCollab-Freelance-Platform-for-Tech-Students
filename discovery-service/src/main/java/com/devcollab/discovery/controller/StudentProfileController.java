package com.devcollab.discovery.controller;

import com.devcollab.discovery.dto.PageResponse;
import com.devcollab.discovery.dto.StudentSearchCriteria;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import com.devcollab.discovery.specification.StudentProfileSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profiles/students")
@RequiredArgsConstructor
public class StudentProfileController {

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
     * Search for students by skills / keyword, with backward compatibility
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "rating") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        // If any advanced filters or pagination are supplied, use advanced search specification
        if (minRating != null || maxRating != null || minHourlyRate != null || maxHourlyRate != null || allSkills != null || page > 0 || size != 20) {
            StudentSearchCriteria criteria = StudentSearchCriteria.builder()
                    .keyword(q)
                    .skills(skills)
                    .allSkills(allSkills)
                    .minRating(minRating)
                    .maxRating(maxRating)
                    .minHourlyRate(minHourlyRate)
                    .maxHourlyRate(maxHourlyRate)
                    .page(page)
                    .size(size)
                    .sortBy(sortBy)
                    .sortDirection(sortDirection)
                    .build();
            return advancedSearchGet(criteria);
        }

        List<StudentProfile> results;
        if (skills != null && !skills.isEmpty()) {
            List<String> lowerSkills = skills.stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
            results = studentProfileRepository.findBySkillsIn(lowerSkills);

            if (q != null && !q.isBlank()) {
                String lowerQ = q.toLowerCase();
                results = results.stream()
                    .filter(profile -> 
                        (profile.getFullName() != null && profile.getFullName().toLowerCase().contains(lowerQ)) ||
                        (profile.getBio() != null && profile.getBio().toLowerCase().contains(lowerQ)) ||
                        (profile.getSkills() != null && profile.getSkills().stream()
                            .anyMatch(skill -> skill.toLowerCase().contains(lowerQ)))
                    )
                    .collect(Collectors.toList());
            }
        } else if (q != null && !q.isBlank()) {
            String lowerQ = q.toLowerCase();
            List<StudentProfile> allProfiles = studentProfileRepository.findAll();
            results = allProfiles.stream()
                .filter(profile -> 
                    (profile.getFullName() != null && profile.getFullName().toLowerCase().contains(lowerQ)) ||
                    (profile.getBio() != null && profile.getBio().toLowerCase().contains(lowerQ)) ||
                    (profile.getSkills() != null && profile.getSkills().stream()
                        .anyMatch(skill -> skill.toLowerCase().contains(lowerQ)))
                )
                .collect(Collectors.toList());
        } else {
            results = studentProfileRepository.findAll();
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", results);
        res.put("count", results.size());
        return ResponseEntity.ok(res);
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
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        return advancedSearchGet(criteria);
    }

    @PostMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearchPost(
            @RequestBody StudentSearchCriteria criteria) {
        return advancedSearchGet(criteria);
    }

    private ResponseEntity<Map<String, Object>> advancedSearchGet(StudentSearchCriteria criteria) {
        String sortBy = criteria.getSortBy();
        if (sortBy == null || sortBy.isBlank()) {
            sortBy = "rating";
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(criteria.getSortDirection())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        PageRequest pageRequest = PageRequest.of(
                Math.max(0, criteria.getPage()),
                Math.max(1, criteria.getSize()),
                Sort.by(direction, sortBy)
        );

        Specification<StudentProfile> spec = StudentProfileSpecification.build(criteria);
        Page<StudentProfile> pageResult = studentProfileRepository.findAll(spec, pageRequest);
        PageResponse<StudentProfile> responsePage = PageResponse.from(pageResult);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", responsePage.getContent());
        res.put("page", responsePage.getPage());
        res.put("size", responsePage.getSize());
        res.put("totalElements", responsePage.getTotalElements());
        res.put("totalPages", responsePage.getTotalPages());
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProfile(@RequestBody StudentProfile profile) {
        StudentProfile saved = studentProfileRepository.save(profile);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable String id,
            @RequestBody StudentProfile profile) {
        return studentProfileRepository.findById(id)
                .or(() -> studentProfileRepository.findByUserId(id))
                .map(existing -> {
                    if (profile.getFullName() != null) existing.setFullName(profile.getFullName());
                    if (profile.getHeadline() != null) existing.setHeadline(profile.getHeadline());
                    if (profile.getBio() != null) existing.setBio(profile.getBio());
                    if (profile.getHourlyRate() != null) existing.setHourlyRate(profile.getHourlyRate());
                    if (profile.getSkills() != null) existing.setSkills(profile.getSkills());
                    StudentProfile updated = studentProfileRepository.save(existing);
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("data", updated);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "error", "Student profile not found")));
    }
}
