package com.devcollab.discovery.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

@Configuration
@EnableElasticsearchRepositories(basePackages = "com.devcollab.discovery.repository")
public class ElasticsearchConfig {
}
