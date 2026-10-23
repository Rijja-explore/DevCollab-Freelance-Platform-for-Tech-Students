package com.devcollab.discovery.controller;

import com.devcollab.discovery.auth.JwtTokenService;
import com.devcollab.discovery.dto.*;
import com.devcollab.discovery.entity.ProfileReview;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import com.devcollab.discovery.service.MatchingService;
import com.devcollab.discovery.service.ProfileReviewService;
import com.devcollab.discovery.service.ProjectService;
import com.devcollab.discovery.skillgap.SkillGapService;
import com.devcollab.discovery.skillgap.SkillGapTypes.SkillGapAnalysis;
import com.devcollab.discovery.specification.StudentProfileSpecification;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.util.*;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ProjectGraphQLController {

    private final ProjectService projectService;
    private final MatchingService matchingService;
    private final StudentProfileRepository studentProfileRepository;
    private final ProfileReviewService profileReviewService;
    private final SkillGapService skillGapService;
    private final JwtTokenService jwtTokenService;
    private final HttpServletRequest request;

    @QueryMapping
    public List<Project> projects(@Argument String category, @Argument String status,
                                  @Argument Integer page, @Argument Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : 20;
        return projectService.getAllProjects(category, status, p, s);
    }

    @QueryMapping
    public Project project(@Argument String id) {
        return projectService.getProjectById(id).orElse(null);
    }

    @QueryMapping
    public List<Project> searchProjects(@Argument String keyword, @Argument List<String> skills,
                                        @Argument String category) {
        return projectService.searchProjects(keyword, skills, category);
    }

    @QueryMapping
    public PageResponse<Project> advancedSearchProjects(@Argument ProjectFilterInput filter) {
        ProjectSearchCriteria criteria = ProjectSearchCriteria.builder()
                .keyword(filter.getKeyword())
                .category(filter.getCategory())
                .status(filter.getStatus())
                .skills(filter.getSkills())
                .allSkills(filter.getAllSkills())
                .minBudget(filter.getMinBudget() != null ? BigDecimal.valueOf(filter.getMinBudget()) : null)
                .maxBudget(filter.getMaxBudget() != null ? BigDecimal.valueOf(filter.getMaxBudget()) : null)
                .currency(filter.getCurrency())
                .startupId(filter.getStartupId())
                .page(filter.getPage() != null ? filter.getPage() : 0)
                .size(filter.getSize() != null ? filter.getSize() : 20)
                .sortBy(filter.getSortBy() != null ? filter.getSortBy() : "createdAt")
                .sortDirection(filter.getSortDirection() != null ? filter.getSortDirection() : "desc")
                .build();
        return projectService.searchProjectsAdvanced(criteria);
    }

    @QueryMapping
    public PageResponse<StudentProfile> advancedSearchStudents(@Argument StudentFilterInput filter) {
        StudentSearchCriteria criteria = StudentSearchCriteria.builder()
                .keyword(filter.getKeyword())
                .skills(filter.getSkills())
                .allSkills(filter.getAllSkills())
                .minRating(filter.getMinRating())
                .maxRating(filter.getMaxRating())
                .minHourlyRate(filter.getMinHourlyRate() != null ? BigDecimal.valueOf(filter.getMinHourlyRate()) : null)
                .maxHourlyRate(filter.getMaxHourlyRate() != null ? BigDecimal.valueOf(filter.getMaxHourlyRate()) : null)
                .page(filter.getPage() != null ? filter.getPage() : 0)
                .size(filter.getSize() != null ? filter.getSize() : 20)
                .sortBy(filter.getSortBy() != null ? filter.getSortBy() : "rating")
                .sortDirection(filter.getSortDirection() != null ? filter.getSortDirection() : "desc")
                .build();

        String sortBy = criteria.getSortBy() != null ? criteria.getSortBy() : "rating";
        Sort.Direction direction = "asc".equalsIgnoreCase(criteria.getSortDirection())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        PageRequest pageRequest = PageRequest.of(
                Math.max(0, criteria.getPage()),
                Math.max(1, criteria.getSize()),
                Sort.by(direction, sortBy)
        );

        Page<StudentProfile> result = studentProfileRepository.findAll(StudentProfileSpecification.build(criteria), pageRequest);
        return PageResponse.from(result);
    }

    @QueryMapping
    public List<MatchingService.ProjectRecommendation> matchRecommendations(@Argument String studentId) {
        return matchingService.getRecommendations(studentId);
    }

    @QueryMapping
    public List<MatchingService.CandidateRecommendation> candidateRecommendations(
            @Argument String projectId, @Argument Integer limit) {
        int lim = limit != null ? limit : 10;
        return matchingService.getRecommendedCandidatesForProject(projectId, lim);
    }

    @QueryMapping
    public List<MatchingService.SimilarProjectRecommendation> similarProjects(
            @Argument String projectId, @Argument Integer limit) {
        int lim = limit != null ? limit : 6;
        return matchingService.getSimilarProjects(projectId, lim);
    }

    @QueryMapping
    public List<MatchingService.SimilarStudentRecommendation> similarStudents(
            @Argument String studentId, @Argument Integer limit) {
        int lim = limit != null ? limit : 6;
        return matchingService.getSimilarStudents(studentId, lim);
    }

    @QueryMapping
    public StudentProfile studentProfile(@Argument String id) {
        return studentProfileRepository.findById(id)
                .or(() -> studentProfileRepository.findByUserId(id))
                .orElse(null);
    }

    @QueryMapping
    public List<StudentProfile> allStudentProfiles() {
        return studentProfileRepository.findAll();
    }

    @QueryMapping
    public List<ProfileReview> studentReviews(
            @Argument String studentId, @Argument Integer page, @Argument Integer size) {
        int p = page != null ? page : 0;
        int s = size != null ? size : 10;
        return profileReviewService.getReviewsForStudent(studentId, p, s).getContent();
    }

    @QueryMapping
    public ReviewSummaryGqlDto studentReviewSummary(@Argument String studentId) {
        ReviewSummaryDto summary = profileReviewService.getReviewSummary(studentId);
        List<RatingDistributionEntryGqlDto> dist = new ArrayList<>();
        if (summary.getRatingDistribution() != null) {
            summary.getRatingDistribution().forEach((stars, count) ->
                    dist.add(new RatingDistributionEntryGqlDto(stars, count.intValue())));
        }
        return ReviewSummaryGqlDto.builder()
                .studentId(summary.getStudentId())
                .averageRating(summary.getAverageRating())
                .totalReviews(summary.getTotalReviews() != null ? summary.getTotalReviews().intValue() : 0)
                .distribution(dist)
                .build();
    }

    @QueryMapping
    public SkillGapAnalysis skillGap(@Argument String studentId, @Argument String projectId) {
        DecodedJWT jwt = authenticatedUser();
        String role = role(jwt);
        if ("ADMIN".equals(role)) {
            return skillGapService.analyze(studentId, projectId);
        }
        if ("STUDENT".equals(role)
                && (studentId.equals(jwt.getSubject())
                || studentProfileRepository.findByUserId(jwt.getSubject()).map(profile -> profile.getId().equals(studentId)).orElse(false))) {
            return skillGapService.analyze(studentId, projectId);
        }
        throw new IllegalArgumentException("Forbidden: you cannot inspect this student's skill gap");
    }

    @QueryMapping
    public SkillGapAnalysis analyzeMySkillGap(@Argument String projectId) {
        DecodedJWT jwt = authenticatedUser();
        if (!"STUDENT".equals(role(jwt))) {
            throw new IllegalArgumentException("Forbidden: STUDENT role required");
        }
        return skillGapService.analyze(jwt.getSubject(), projectId);
    }

    private DecodedJWT authenticatedUser() {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Unauthorized: bearer token required");
        }
        try {
            return jwtTokenService.verifyToken(authorization.substring(7));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Unauthorized: invalid or expired token");
        }
    }

    private String role(DecodedJWT jwt) {
        String role = jwt.getClaim("role").asString();
        return role == null ? "" : role.toUpperCase(Locale.ROOT);
    }

    @MutationMapping
    public Project createProject(@Argument CreateProjectInput input) {
        return projectService.createProject(
                input.getStartupId(),
                input.getTitle(),
                input.getDescription(),
                input.getCategory(),
                input.getBudget() != null ? BigDecimal.valueOf(input.getBudget()) : BigDecimal.valueOf(1000.00),
                input.getCurrency() != null ? input.getCurrency() : "USD",
                input.getRequiredSkills() != null ? new HashSet<>(input.getRequiredSkills()) : new HashSet<>()
        );
    }

    @MutationMapping
    public Project updateProjectStatus(@Argument String id, @Argument String status) {
        return projectService.updateStatus(id, ProjectStatus.valueOf(status.toUpperCase()));
    }

    @MutationMapping
    public MatchingService.MatchResult matchProject(@Argument String projectId, @Argument String studentId) {
        return matchingService.matchProject(projectId, studentId);
    }

    @MutationMapping
    public StudentProfile createStudentProfile(@Argument CreateStudentProfileInput input) {
        StudentProfile profile = StudentProfile.builder()
                .userId(input.getUserId() != null ? input.getUserId() : UUID.randomUUID().toString())
                .fullName(input.getFullName())
                .headline(input.getHeadline())
                .bio(input.getBio())
                .hourlyRate(input.getHourlyRate() != null ? BigDecimal.valueOf(input.getHourlyRate()) : BigDecimal.valueOf(35.00))
                .skills(input.getSkills() != null ? new HashSet<>(input.getSkills()) : new HashSet<>())
                .build();
        return studentProfileRepository.save(profile);
    }

    @MutationMapping
    public ProfileReview addProfileReview(@Argument String studentId, @Argument CreateProfileReviewInput input) {
        CreateReviewDto dto = CreateReviewDto.builder()
                .reviewerId(input.getReviewerId())
                .reviewerName(input.getReviewerName())
                .projectId(input.getProjectId())
                .rating(input.getRating())
                .title(input.getTitle())
                .comment(input.getComment())
                .build();
        return profileReviewService.addReview(studentId, dto);
    }

    @MutationMapping
    public Boolean deleteProfileReview(@Argument String reviewId) {
        profileReviewService.deleteReview(reviewId);
        return true;
    }

    @Data
    public static class CreateProjectInput {
        private String startupId;
        private String title;
        private String description;
        private String category;
        private Double budget;
        private String currency;
        private List<String> requiredSkills;
    }

    @Data
    public static class CreateStudentProfileInput {
        private String userId;
        private String fullName;
        private String headline;
        private String bio;
        private Double hourlyRate;
        private List<String> skills;
    }

    @Data
    public static class ProjectFilterInput {
        private String keyword;
        private String category;
        private String status;
        private List<String> skills;
        private Boolean allSkills;
        private Double minBudget;
        private Double maxBudget;
        private String currency;
        private String startupId;
        private Integer page;
        private Integer size;
        private String sortBy;
        private String sortDirection;
    }

    @Data
    public static class StudentFilterInput {
        private String keyword;
        private List<String> skills;
        private Boolean allSkills;
        private Double minRating;
        private Double maxRating;
        private Double minHourlyRate;
        private Double maxHourlyRate;
        private Integer page;
        private Integer size;
        private String sortBy;
        private String sortDirection;
    }

    @Data
    public static class CreateProfileReviewInput {
        private String reviewerId;
        private String reviewerName;
        private String projectId;
        private Integer rating;
        private String title;
        private String comment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewSummaryGqlDto {
        private String studentId;
        private Double averageRating;
        private Integer totalReviews;
        private List<RatingDistributionEntryGqlDto> distribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatingDistributionEntryGqlDto {
        private Integer stars;
        private Integer count;
    }
}
