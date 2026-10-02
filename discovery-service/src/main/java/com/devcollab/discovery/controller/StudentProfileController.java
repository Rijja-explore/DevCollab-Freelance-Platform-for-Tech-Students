package com.devcollab.discovery.controller;

import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * Search for students by skills (talent search)
     * Supports comma-separated or array of skills
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBySkills(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> skills) {
        
        List<StudentProfile> results;
        
        if (skills != null && !skills.isEmpty()) {
            // Convert to lowercase for case-insensitive matching
            List<String> lowerSkills = skills.stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
            results = studentProfileRepository.findBySkillsIn(lowerSkills);
            
            // If also have keyword, filter results further
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
            // Search by keyword in name, bio, OR skills
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
            // Return all students
            results = studentProfileRepository.findAll();
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", results);
        res.put("count", results.size());
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
}
