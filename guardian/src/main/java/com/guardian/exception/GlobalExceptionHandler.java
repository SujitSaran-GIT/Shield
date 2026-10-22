package com.guardian.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    public record ErrorResponse(int status, String message, Instant timestamp) {}
    private ResponseEntity<ErrorResponse> error(int status, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(status, message, Instant.now()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> rateLimit(RateLimitExceededException ex) {
        return ResponseEntity.status(429).header("Retry-After", "60")
                .body(new ErrorResponse(429, "Too many attempts; retry later", Instant.now()));
    }
    @ExceptionHandler({AuthenticationException.class, InvalidClientException.class})
    public ResponseEntity<ErrorResponse> credentials(RuntimeException ex) { return error(401, "Invalid credentials"); }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> accessDenied(AccessDeniedException ex) { return error(403, "Access denied"); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException ex) { return error(409, "The requested account or configuration conflicts with an existing record"); }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> invalidRequest(Exception ex) { return error(400, "Invalid request format"); }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> status(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String message = status >= 500 ? "A required service is temporarily unavailable"
                : com.guardian.util.SensitiveDataRedactor.clean(ex.getReason(), 500);
        return error(status, message == null ? "Request could not be completed" : message);
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> argument(IllegalArgumentException ex) {
        return error(400, com.guardian.util.SensitiveDataRedactor.clean(ex.getMessage(), 500));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(e -> fields.put(e instanceof FieldError f ? f.getField() : e.getObjectName(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("status", 400, "message", "Validation failed", "errors", fields, "timestamp", Instant.now()));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> unexpected(Exception ex) {
        // Exception messages can contain SQL parameters and credentials. Keep them out of ordinary logs.
        log.error("Request failed with {}", ex.getClass().getSimpleName());
        return error(500, "An unexpected error occurred");
    }
}
