package com.devcollab.discovery.repository;

import com.devcollab.discovery.entity.ProfileReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfileReviewRepository extends JpaRepository<ProfileReview, String> {

    Page<ProfileReview> findByStudentId(String studentId, Pageable pageable);

    List<ProfileReview> findByStudentId(String studentId);

    List<ProfileReview> findByReviewerId(String reviewerId);

    Optional<ProfileReview> findByStudentIdAndProjectId(String studentId, String projectId);

    @Query("SELECT AVG(r.rating) FROM ProfileReview r WHERE r.studentId = :studentId")
    Double getAverageRating(@Param("studentId") String studentId);

    @Query("SELECT COUNT(r) FROM ProfileReview r WHERE r.studentId = :studentId")
    Long countByStudentId(@Param("studentId") String studentId);

    @Query("SELECT r.rating, COUNT(r) FROM ProfileReview r WHERE r.studentId = :studentId GROUP BY r.rating")
    List<Object[]> getRatingDistribution(@Param("studentId") String studentId);
}

