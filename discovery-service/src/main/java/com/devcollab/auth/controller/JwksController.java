package com.devcollab.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class JwksController { @GetMapping("/.well-known/jwks.json") public ResponseEntity<Map<String,Object>> jwks(){ return ResponseEntity.ok(Map.of("keys", new Object[]{})); } }
