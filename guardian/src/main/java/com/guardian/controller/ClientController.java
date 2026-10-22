package com.guardian.controller;

import com.guardian.dto.ClientDTO;
import com.guardian.dto.PublicClientRegistrationRequest;
import com.guardian.entity.Client;
import com.guardian.repository.UserRepository;
import com.guardian.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final UserRepository userRepository;
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ClientRegistrationResponse> registerClient(
            @Valid @RequestBody ClientRegistrationRequest request) {

        Client client = clientService.registerClient(
                request.name(),
                request.description(),
                request.allowedOrigins(),
                request.idleTimeout()
        );
        
        // Return client credentials (only shown once)
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ClientRegistrationResponse(
                        client.getClientId(),
                        client.getProvisionedSecret(), // Plain text key (only available during registration)
                        "Store these credentials securely. The client key cannot be retrieved again."
                ));
    }
    
    @PostMapping("/public-register")
    @PreAuthorize("hasAuthority('CLIENT_ADMIN')")
    public ResponseEntity<ClientRegistrationResponse> publicRegisterClient(
            @Valid @RequestBody PublicClientRegistrationRequest request) {

        Client client = clientService.publicRegisterClient(
                request.getName(),
                request.getDescription(),
                request.getAllowedOrigins(),
                request.getIdleTimeout()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ClientRegistrationResponse(
                        client.getClientId(),
                        client.getProvisionedSecret(),
                        "Store these credentials securely. The client key cannot be retrieved again."
                ));
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<ClientDTO>> getAllClients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<Client> clients = clientService.getAllClients(PageRequest.of(page, size, sort));

        List<ClientDTO> clientDTOs = clients.getContent().stream()
                .map(client -> {
                    long userCount = userRepository.countByClientId(client.getClientId());
                    return ClientDTO.fromEntityWithUserCount(client, userCount);
                })
                .collect(Collectors.toList());

        Page<ClientDTO> clientDTOPage = new PageImpl<>(
                clientDTOs, PageRequest.of(page, size, sort), clients.getTotalElements());

        return ResponseEntity.ok(clientDTOPage);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ClientDTO> getClientById(@PathVariable UUID id) {
        Client client = clientService.getClientById(id);
        long userCount = userRepository.countByClientId(client.getClientId());
        return ResponseEntity.ok(ClientDTO.fromEntityWithUserCount(client, userCount));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ClientDTO> updateClient(
            @PathVariable UUID id,
            @RequestBody ClientUpdateRequest request) {
        
        Client client = clientService.updateClient(
                id,
                request.name(),
                request.description(),
                request.allowedOrigins(),
                request.idleTimeout()
        );
        
        return ResponseEntity.ok(ClientDTO.fromEntity(client));
    }
    
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<MessageResponse> deactivateClient(@PathVariable UUID id) {
        clientService.deactivateClient(id);
        return ResponseEntity.ok(new MessageResponse("Client deactivated successfully"));
    }
    
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<MessageResponse> activateClient(@PathVariable UUID id) {
        clientService.activateClient(id);
        return ResponseEntity.ok(new MessageResponse("Client activated successfully"));
    }
    
    // DTOs
    @PostMapping("/{id}/rotate-secret")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ClientRegistrationResponse> rotateSecret(@PathVariable UUID id) {
        Client client = clientService.rotateSecret(id);
        return ResponseEntity.ok(new ClientRegistrationResponse(client.getClientId(), client.getProvisionedSecret(), "Previous credential revoked. Store the new secret securely."));
    }

    public record ClientRegistrationRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 3, max = 100) String name,
            @Size(max = 1000) String description,
            @NotEmpty List<String> allowedOrigins,
            Integer idleTimeout) {}

    public record ClientUpdateRequest(
            String name,
            String description,
            List<String> allowedOrigins,
            Integer idleTimeout) {}
    
    public record ClientRegistrationResponse(
            String clientId, 
            String clientKey, 
            String message) {}
    
    public record MessageResponse(String message) {}
}

