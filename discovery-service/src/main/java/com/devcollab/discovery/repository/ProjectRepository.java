package com.devcollab.discovery.repository;

import com.devcollab.discovery.entity.Project;
import com.devcollab.discovery.entity.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {

    List<Project> findByStatus(ProjectStatus status);

    List<Project> findByCategoryIgnoreCase(String category);

    Page<Project> findByStatus(ProjectStatus status, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :kw, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<Project> searchByKeyword(@Param("kw") String keyword);

    @Query("SELECT DISTINCT p FROM Project p JOIN p.requiredSkills s WHERE LOWER(s) IN :skills")
    List<Project> findBySkillsIn(@Param("skills") List<String> skills);
}
