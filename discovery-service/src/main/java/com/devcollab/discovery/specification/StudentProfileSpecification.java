package com.devcollab.discovery.specification;

import com.devcollab.discovery.dto.StudentSearchCriteria;
import com.devcollab.discovery.entity.StudentProfile;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class StudentProfileSpecification {

    public static Specification<StudentProfile> build(StudentSearchCriteria criteria) {
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Keyword search (fullName, headline, bio, or skills)
            if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
                String pattern = "%" + criteria.getKeyword().trim().toLowerCase() + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("fullName")), pattern);

                Predicate headlinePredicate = root.get("headline") != null
                        ? cb.like(cb.lower(root.get("headline")), pattern)
                        : cb.disjunction();

                Predicate bioPredicate = root.get("bio") != null
                        ? cb.like(cb.lower(root.get("bio")), pattern)
                        : cb.disjunction();

                Join<StudentProfile, String> skillsJoin = root.join("skills", JoinType.LEFT);
                Predicate skillPredicate = cb.like(cb.lower(skillsJoin), pattern);

                predicates.add(cb.or(namePredicate, headlinePredicate, bioPredicate, skillPredicate));
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

            // 4. Skills list
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

