package com.devcollab.discovery.repository;

import com.devcollab.discovery.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, String> {
    Optional<StudentProfile> findByUserId(String userId);

    /**
     * Find students by skills (talent search)
     * Matches any student whose skills intersect with the provided list (case-insensitive)
     */
    @Query("SELECT DISTINCT s FROM StudentProfile s JOIN s.skills skill WHERE LOWER(skill) IN :skillsLower")
    List<StudentProfile> findBySkillsIn(@Param("skillsLower") List<String> skills);

    /**
     * Search students by keyword in fullName or bio
     */
    @Query("SELECT s FROM StudentProfile s WHERE LOWER(s.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.bio) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<StudentProfile> searchByKeyword(@Param("keyword") String keyword);
}
