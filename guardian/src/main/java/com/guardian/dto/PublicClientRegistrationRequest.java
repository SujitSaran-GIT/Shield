package com.guardian.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class PublicClientRegistrationRequest {
   
    @NotBlank(message = "Client name is required")
    @Size(min = 3, max = 100, message = "Client name must be between 3 and 100 characters")
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotEmpty(message = "Allowed origins are required")
    private List<String> allowedOrigins;

    private Integer idleTimeout;
}
