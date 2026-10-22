package com.guardian.controller;

import com.guardian.dto.ClientDTO;
import com.guardian.dto.UserDTO;
import com.guardian.service.ClientService;
import com.guardian.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final UserService userService;
    private final ClientService clientService;

    @GetMapping("/global")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Map<String, Object>> globalSearch(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Map<String, Object> results = new HashMap<>();

        // Search users
        Page<UserDTO> users = userService.searchUsers(query, PageRequest.of(page, size))
                .map(UserDTO::fromEntity);
        results.put("users", users);

        // Search clients (if client search is available)
        try {
            // Note: Client search might need to be implemented in ClientService
            // For now, we'll search by name/description
            var clients = clientService.getAllClients().stream()
                    .filter(client ->
                        (client.getName() != null && client.getName().toLowerCase().contains(query.toLowerCase())) ||
                        (client.getDescription() != null && client.getDescription().toLowerCase().contains(query.toLowerCase()))
                    )
                    .map(ClientDTO::fromEntity)
                    .limit(size)
                    .toList();
            results.put("clients", clients);
        } catch (Exception e) {
            results.put("clients", java.util.Collections.emptyList());
        }

        results.put("query", query);
        results.put("totalResults", users.getTotalElements() + ((java.util.List<?>) results.get("clients")).size());

        return ResponseEntity.ok(results);
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<UserDTO>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<UserDTO> users = userService.searchUsers(query, PageRequest.of(page, size))
                .map(UserDTO::fromEntity);

        return ResponseEntity.ok(users);
    }

    @GetMapping("/clients")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<java.util.List<ClientDTO>> searchClients(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {

        var clients = clientService.getAllClients().stream()
                .filter(client ->
                    (client.getName() != null && client.getName().toLowerCase().contains(query.toLowerCase())) ||
                    (client.getDescription() != null && client.getDescription().toLowerCase().contains(query.toLowerCase()))
                )
                .map(ClientDTO::fromEntity)
                .limit(limit)
                .toList();

        return ResponseEntity.ok(clients);
    }
}

