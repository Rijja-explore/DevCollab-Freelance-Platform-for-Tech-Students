package com.devcollab.discovery.specification;

import com.devcollab.discovery.dto.StudentSearchCriteria;
import com.devcollab.discovery.entity.StudentProfile;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class StudentProfileSpecification {

    /** Public sort keys mapped to entity properties; anything else falls back to rating. */
    private static final Map<String, String> SORTABLE = Map.of(
            "rating", "rating",
            "reviewcount", "reviewCount",
            "hourlyrate", "hourlyRate",
            "fullname", "fullName",
            "name", "fullName",
            "createdat", "createdAt"
    );

    public static Sort sort(StudentSearchCriteria criteria) {
        String key = criteria.getSortBy() != null ? criteria.getSortBy().trim().toLowerCase() : "";
        String property = SORTABLE.getOrDefault(key, "rating");
        Sort.Direction direction = "asc".equalsIgnoreCase(criteria.getSortDirection())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        // Secondary keys keep paging stable when many profiles share a rating
        return Sort.by(direction, property).and(Sort.by(Sort.Direction.DESC, "reviewCount")).and(Sort.by("id"));
    }

    public static Specification<StudentProfile> build(StudentSearchCriteria criteria) {
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Keyword search (fullName, headline, bio, location or skills)
            if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
                String pattern = "%" + criteria.getKeyword().trim().toLowerCase() + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("fullName")), pattern);
                Predicate headlinePredicate = cb.like(cb.lower(root.get("headline")), pattern);
                Predicate bioPredicate = cb.like(cb.lower(root.get("bio")), pattern);
                Predicate locationPredicate = cb.like(cb.lower(root.get("location")), pattern);

                Join<StudentProfile, String> skillsJoin = root.join("skills", JoinType.LEFT);
                Predicate skillPredicate = cb.like(cb.lower(skillsJoin), pattern);

                predicates.add(cb.or(namePredicate, headlinePredicate, bioPredicate, locationPredicate, skillPredicate));
            }

            // 2. Rating range
            if (criteria.getMinRating() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("rating"), criteria.getMinRating()));
            }
            if (criteria.getMaxRating() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("rating"), criteria.getMaxRating()));
            }

            // 3. Hourly rate range
            if (criteria.getMinHourlyRate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("hourlyRate"), criteria.getMinHourlyRate()));
            }
            if (criteria.getMaxHourlyRate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("hourlyRate"), criteria.getMaxHourlyRate()));
            }

            // 4. Location
            if (criteria.getLocation() != null && !criteria.getLocation().isBlank()) {
                String pattern = "%" + criteria.getLocation().trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("location")), pattern));
            }

            // 5. Availability
            if (criteria.getAvailability() != null) {
                List<String> statuses = criteria.getAvailability().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> s.trim().toUpperCase())
                        .toList();
                if (!statuses.isEmpty()) {
                    predicates.add(root.get("availability").in(statuses));
                }
            }

            // 6. Skills list
            if (criteria.getSkills() != null && !criteria.getSkills().isEmpty()) {
                List<String> lowerSkills = criteria.getSkills().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> s.trim().toLowerCase())
                        .toList();

                if (!lowerSkills.isEmpty()) {
                    boolean all = Boolean.TRUE.equals(criteria.getAllSkills());
                    if (all) {
                        for (String skill : lowerSkills) {
                            Subquery<Long> subquery = query.subquery(Long.class);
                            Root<StudentProfile> subRoot = subquery.from(StudentProfile.class);
                            Join<StudentProfile, String> subSkills = subRoot.join("skills");
                            subquery.select(cb.literal(1L))
                                    .where(
                                            cb.equal(subRoot.get("id"), root.get("id")),
                                            cb.equal(cb.lower(subSkills), skill)
                                    );
                            predicates.add(cb.exists(subquery));
                        }
                    } else {
                        Join<StudentProfile, String> skillsJoin = root.join("skills", JoinType.INNER);
                        predicates.add(cb.lower(skillsJoin).in(lowerSkills));
                    }
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
