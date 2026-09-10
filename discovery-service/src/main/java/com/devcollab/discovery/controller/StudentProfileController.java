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

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProfile(@RequestBody StudentProfile profile) {
        StudentProfile saved = studentProfileRepository.save(profile);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }
}
