package com.guardian.controller;

import com.guardian.dto.AuditDTO;
import com.guardian.repository.AuditLogRepository;
import com.guardian.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserActivityController {
    private final UserService users;
    private final AuditLogRepository audits;

    @GetMapping("/{id}/activity")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN','CLIENT_ADMIN')")
    public Page<AuditDTO> activity(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,
                                   @RequestParam(defaultValue="20") int size) {
        if(page<0 || size<1 || size>100) throw new IllegalArgumentException("Invalid pagination");
        // Authorize the target before querying any of their security history.
        users.getVisibleUserById(id);
        return audits.findAll((root,query,builder) -> builder.equal(root.get("userId"),id),
                PageRequest.of(page,size,Sort.by("createdAt").descending())).map(AuditDTO::fromEntity);
    }
}
