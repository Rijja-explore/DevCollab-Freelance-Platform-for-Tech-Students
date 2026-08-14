package com.devcollab.auth.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req){ return ResponseEntity.badRequest().body(ApiError.builder().timestamp(Instant.now()).status(400).error("Bad Request").message("Validation failed").path(req.getRequestURI()).build()); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAny(Exception ex, HttpServletRequest req){ return ResponseEntity.status(500).body(ApiError.builder().timestamp(Instant.now()).status(500).error("Internal Server Error").message("Internal server error").path(req.getRequestURI()).build()); }
}
