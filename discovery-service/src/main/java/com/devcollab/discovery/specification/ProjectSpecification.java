package com.devcollab.discovery.specification;

import com.devcollab.discovery.dto.ProjectSearchCriteria;
import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ProjectSpecification {

    /** Public sort keys mapped to entity properties; anything else falls back to createdAt. */
    private static final Map<String, String> SORTABLE = Map.of(
            "createdat", "createdAt",
            "budget", "budget",
            "title", "title",
            "category", "category",
            "updatedat", "updatedAt"
    );

    public static Sort sort(ProjectSearchCriteria criteria) {
        String key = criteria.getSortBy() != null ? criteria.getSortBy().trim().toLowerCase() : "";
        String property = SORTABLE.getOrDefault(key, "createdAt");
        Sort.Direction direction = "asc".equalsIgnoreCase(criteria.getSortDirection())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, property).and(Sort.by("id"));
    }

    public static Specification<Project> build(ProjectSearchCriteria criteria) {
        return (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Keyword search (title, description, or skill match)
            if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
                String pattern = "%" + criteria.getKeyword().trim().toLowerCase() + "%";
                Predicate titlePredicate = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descPredicate = cb.like(cb.lower(root.get("description")), pattern);

                // Join skills for keyword search
                Join<Project, String> skillsJoin = root.join("requiredSkills", JoinType.LEFT);
                Predicate skillPredicate = cb.like(cb.lower(skillsJoin), pattern);

                predicates.add(cb.or(titlePredicate, descPredicate, skillPredicate));
            }

            // 2. Category filter
            if (criteria.getCategory() != null && !criteria.getCategory().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("category")), criteria.getCategory().trim().toLowerCase()));
            }

            // 3. Status filter
            if (criteria.getStatus() != null && !criteria.getStatus().isBlank()) {
                try {
                    ProjectStatus statusEnum = ProjectStatus.valueOf(criteria.getStatus().trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                } catch (IllegalArgumentException ignored) {
                    // Ignore invalid status enum or match nothing
                }
            }

            // 4. Budget range
            if (criteria.getMinBudget() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("budget"), criteria.getMinBudget()));
            }
            if (criteria.getMaxBudget() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("budget"), criteria.getMaxBudget()));
            }

            // 5. Currency
            if (criteria.getCurrency() != null && !criteria.getCurrency().isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("currency")), criteria.getCurrency().trim().toUpperCase()));
            }

            // 6. Startup ID
            if (criteria.getStartupId() != null && !criteria.getStartupId().isBlank()) {
                predicates.add(cb.equal(root.get("startupId"), criteria.getStartupId().trim()));
            }

            // 7. Skills list filter
            if (criteria.getSkills() != null && !criteria.getSkills().isEmpty()) {
                List<String> lowerSkills = criteria.getSkills().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> s.trim().toLowerCase())
                        .toList();

                if (!lowerSkills.isEmpty()) {
                    boolean all = Boolean.TRUE.equals(criteria.getAllSkills());
                    if (all) {
                        // Project must contain all listed skills
                        for (String skill : lowerSkills) {
                            Subquery<Long> subquery = query.subquery(Long.class);
                            Root<Project> subRoot = subquery.from(Project.class);
                            Join<Project, String> subSkills = subRoot.join("requiredSkills");
                            subquery.select(cb.literal(1L))
                                    .where(
                                            cb.equal(subRoot.get("id"), root.get("id")),
                                            cb.equal(cb.lower(subSkills), skill)
                                    );
                            predicates.add(cb.exists(subquery));
                        }
                    } else {
                        // Match any skill
                        Join<Project, String> skillsJoin = root.join("requiredSkills", JoinType.INNER);
                        predicates.add(cb.lower(skillsJoin).in(lowerSkills));
                    }
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

