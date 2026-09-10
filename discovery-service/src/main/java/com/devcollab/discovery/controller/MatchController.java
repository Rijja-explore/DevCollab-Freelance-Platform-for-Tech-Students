package com.devcollab.discovery.controller;

import com.devcollab.discovery.service.MatchingService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchingService matchingService;
    private final com.devcollab.discovery.repository.MatchRecordRepository matchRecordRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllMatches() {
        List<com.devcollab.discovery.entity.MatchRecord> matches = matchRecordRepository.findAll();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", matches);
        response.put("count", matches.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<Map<String, Object>> getStudentMatches(@PathVariable String studentId) {
        List<com.devcollab.discovery.entity.MatchRecord> matches = matchRecordRepository.findByStudentId(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", matches);
        response.put("count", matches.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/startup/{startupId}")
    public ResponseEntity<Map<String, Object>> getStartupMatches(@PathVariable String startupId) {
        List<com.devcollab.discovery.entity.MatchRecord> matches = matchRecordRepository.findByStartupId(startupId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", matches);
        response.put("count", matches.size());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> matchProject(@RequestBody MatchRequestDto request) {
        MatchingService.MatchResult result = matchingService.matchProject(request.getProjectId(), request.getStudentId());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/recommendations/{studentId}")
    public ResponseEntity<Map<String, Object>> getRecommendations(@PathVariable String studentId) {
        List<MatchingService.ProjectRecommendation> recs = matchingService.getRecommendations(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", recs);
        response.put("count", recs.size());
        return ResponseEntity.ok(response);
    }

    @Data
    public static class MatchRequestDto {
        private String projectId;
        private String studentId;
    }
}
