package com.devcollab.discovery.skillgap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.devcollab.discovery.skillgap.SkillGapTypes.CourseRecommendation;

@Service
@Slf4j
public class YouTubeLearningResourceService {
    private static final String SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
    private static final int MAX_RESULTS = 3;
    private static final long CACHE_TTL_MILLIS = 12 * 60 * 60 * 1000L;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final Map<String, CachedRecommendations> cache = new ConcurrentHashMap<>();

    public YouTubeLearningResourceService(
            ObjectMapper objectMapper,
            @Value("${youtube.api-key:}") String apiKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);
        requestFactory.setReadTimeout(5000);
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public List<CourseRecommendation> findBySkill(String skill) {
        if (apiKey.isBlank() || skill == null || skill.isBlank()) {
            return List.of();
        }
        String normalizedSkill = skill.trim().toLowerCase(Locale.ROOT);
        CachedRecommendations cached = cache.get(normalizedSkill);
        if (cached != null && !cached.isExpired()) {
            return cached.recommendations();
        }

        URI uri = UriComponentsBuilder.fromUriString(SEARCH_ENDPOINT)
                .queryParam("part", "snippet")
                .queryParam("q", skill.trim() + " English tutorial playlist")
                .queryParam("type", "playlist")
                .queryParam("order", "viewCount")
                .queryParam("relevanceLanguage", "en")
                .queryParam("maxResults", MAX_RESULTS)
                .queryParam("key", apiKey)
                .build()
                .encode()
                .toUri();

        try {
            String response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);
            List<CourseRecommendation> recommendations = parseRecommendations(response, skill.trim());
            cache.put(normalizedSkill, new CachedRecommendations(recommendations, System.currentTimeMillis()));
            return recommendations;
        } catch (RuntimeException exception) {
            log.warn("YouTube playlist search failed for skill '{}': {}", skill, exception.getMessage());
            return List.of();
        }
    }

    private List<CourseRecommendation> parseRecommendations(String response, String skill) {
        try {
            JsonNode items = objectMapper.readTree(response).path("items");
            List<CourseRecommendation> recommendations = new ArrayList<>();
            for (JsonNode item : items) {
                String playlistId = item.path("id").path("playlistId").asText("");
                JsonNode snippet = item.path("snippet");
                String title = snippet.path("title").asText("");
                if (playlistId.isBlank() || title.isBlank()) {
                    continue;
                }

                String description = snippet.path("description").asText("");
                String reason = "Matches the missing " + skill + " skill as a free English YouTube playlist.";

                recommendations.add(new CourseRecommendation(
                        "youtube-playlist-" + playlistId,
                        title,
                        skill,
                        snippet.path("channelTitle").asText("YouTube"),
                        0,
                        0,
                        "USD",
                        inferDifficulty(title + " " + description),
                        "https://www.youtube.com/playlist?list=" + playlistId,
                        reason,
                        score(title, description),
                        "PLAYLIST",
                        0,
                        0
                ));
            }
            return recommendations;
        } catch (Exception exception) {
            log.warn("Could not parse YouTube playlist response for skill '{}': {}", skill, exception.getMessage());
            return List.of();
        }
    }

    private double score(String title, String description) {
        String searchableText = (title + " " + description).toLowerCase(Locale.ROOT);
        double score = 70;
        if (searchableText.contains("beginner") || searchableText.contains("for beginners")) {
            score += 15;
        }
        if (searchableText.contains("course") || searchableText.contains("tutorial")) {
            score += 10;
        }
        if (searchableText.contains("complete") || searchableText.contains("full")) {
            score += 5;
        }
        return score;
    }

    private String inferDifficulty(String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        if (normalized.contains("advanced")) {
            return "Advanced";
        }
        if (normalized.contains("intermediate")) {
            return "Intermediate";
        }
        return "Beginner";
    }

    private record CachedRecommendations(List<CourseRecommendation> recommendations, long createdAt) {
        private boolean isExpired() {
            return System.currentTimeMillis() - createdAt >= CACHE_TTL_MILLIS;
        }
    }
}
