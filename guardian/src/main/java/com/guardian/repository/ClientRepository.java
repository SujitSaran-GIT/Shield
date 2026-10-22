package com.guardian.repository;

import com.guardian.entity.Client;
import com.guardian.entity.Client.ClientStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findByOwnerUserId(UUID ownerUserId);
    Page<Client> findByOwnerUserId(UUID ownerUserId, Pageable pageable);
    boolean existsByClientIdAndOwnerUserId(String clientId, UUID ownerUserId);
    long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
    long countByOwnerUserIdAndCreatedAtBetween(UUID owner, java.time.LocalDateTime start, java.time.LocalDateTime end);
    long countByOwnerUserId(UUID owner);
    long countByOwnerUserIdAndStatus(UUID owner, ClientStatus status);
    
    Optional<Client> findByClientId(String clientId);
    
    boolean existsByClientId(String clientId);

    boolean existsByName(String name);
    
    long countByStatus(ClientStatus status);
    
    @Query("SELECT COUNT(c) FROM Client c WHERE c.status = 'ACTIVE'")
    long countActiveClients();
}
