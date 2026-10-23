package com.devcollab.discovery.controller;

import com.devcollab.discovery.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final MatchingService matchingService;

    /**
     * Get project recommendations for a student developer
     */
    @GetMapping("/students/{studentId}/projects")
    public ResponseEntity<Map<String, Object>> getProjectRecommendationsForStudent(@PathVariable String studentId) {
        List<MatchingService.ProjectRecommendation> recs = matchingService.getRecommendations(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", recs);
        response.put("count", recs.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Get candidate student recommendations for a startup project
     */
    @GetMapping("/projects/{projectId}/candidates")
    public ResponseEntity<Map<String, Object>> getCandidateRecommendationsForProject(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "10") int limit) {
        List<MatchingService.CandidateRecommendation> candidates = matchingService.getRecommendedCandidatesForProject(projectId, limit);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", candidates);
        response.put("count", candidates.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Get similar projects to a given project
     */
    @GetMapping("/projects/{projectId}/similar")
    public ResponseEntity<Map<String, Object>> getSimilarProjects(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "6") int limit) {
        List<MatchingService.SimilarProjectRecommendation> similar = matchingService.getSimilarProjects(projectId, limit);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", similar);
        response.put("count", similar.size());
        return ResponseEntity.ok(response);
    }

    /**
     * "Freelancers similar to those you viewed" — ids are the viewer's recently viewed
     * student profiles, most recent first (e.g. ?ids=a&ids=b or ?ids=a,b).
     */
    @GetMapping("/students/from-views")
    public ResponseEntity<Map<String, Object>> getStudentsSimilarToViewed(
            @RequestParam(required = false) List<String> ids,
            @RequestParam(defaultValue = "6") int limit) {
        List<MatchingService.SimilarStudentRecommendation> similar = matchingService.getStudentsSimilarToViewed(ids, limit);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", similar);
        response.put("count", similar.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Get similar students to a given student
     */
    @GetMapping("/students/{studentId}/similar")
    public ResponseEntity<Map<String, Object>> getSimilarStudents(
            @PathVariable String studentId,
            @RequestParam(defaultValue = "6") int limit) {
        List<MatchingService.SimilarStudentRecommendation> similar = matchingService.getSimilarStudents(studentId, limit);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", similar);
        response.put("count", similar.size());
        return ResponseEntity.ok(response);
    }
}

