package com.devcollab.discovery.repository;

import com.devcollab.discovery.document.ProjectDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectElasticsearchRepository extends ElasticsearchRepository<ProjectDocument, String> {

    List<ProjectDocument> findByTitleContainingOrDescriptionContaining(String title, String description);

    List<ProjectDocument> findByCategoryIgnoreCase(String category);

    List<ProjectDocument> findBySkillsIn(List<String> skills);
}
