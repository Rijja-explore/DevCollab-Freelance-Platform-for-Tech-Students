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
