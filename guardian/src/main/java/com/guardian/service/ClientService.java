package com.guardian.service;

import com.guardian.entity.Client;
import com.guardian.entity.Client.ClientStatus;
import com.guardian.entity.enums.EventType;
import com.guardian.exception.InvalidClientException;
import com.guardian.repository.ClientRepository;
import com.guardian.repository.RefreshTokenRepository;
import com.guardian.repository.UserSessionRepository;
import com.guardian.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClientService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    /** Acquire before the user and refresh-token locks in credential transactions. */
    public Client lockCredentials(String clientId) {
        Client client = clientRepository.findByClientId(clientId)
                .orElseThrow(() -> new InvalidClientException("Invalid client credentials"));
        entityManager.flush();
        entityManager.refresh(client, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return client;
    }
    private final ClientRepository clientRepository;
    private final EncryptionUtil encryptionUtil;
    private final PasswordEncoder passwordEncoder;
    private final TenantAccess access;
    private final AuditService audit;
    private final RefreshTokenRepository refreshTokens;
    private final UserSessionRepository sessions;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public Client registerClient(String name, String description, List<String> origins, Integer timeout) {
        access.requireClientAdmin();
        validate(name, origins, timeout);
        if (description != null && description.length() > 1000) throw new IllegalArgumentException("Description too long");
        if (clientRepository.existsByName(name)) throw new IllegalArgumentException("Client name already exists");
        String secret = newSecret();
        Client client = Client.builder().clientId("CLIENT_ID_" + UUID.randomUUID())
                .clientKey(passwordEncoder.encode(secret)).ownerUserId(access.currentUser().getId())
                .name(name).description(description).allowedOrigins(new ArrayList<>(origins)).idleTimeout(timeout == null ? 1800 : timeout)
                .status(ClientStatus.ACTIVE).build();
        Client saved = clientRepository.save(client);
        saved.setProvisionedSecret(secret);
        event(saved, EventType.CLIENT_REGISTRATION_SUCCESS, "Client created");
        return saved;
    }

    @Transactional
    public Client validateClient(String clientId, String secret) {
        Client client = lockCredentials(clientId);
        if (client.getStatus() != ClientStatus.ACTIVE || secret == null) throw new InvalidClientException("Invalid client credentials");
        String stored = client.getClientKey();
        boolean matches = stored != null && stored.startsWith("$2") && passwordEncoder.matches(secret, stored);
        if (!matches) throw new InvalidClientException("Invalid client credentials");
        return client;
    }

    @Transactional(readOnly = true)
    public Client getClientById(UUID id) {
        Client client = clientRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Client not found"));
        access.requireClientAccess(client.getClientId());
        initializeOrigins(client);
        return client;
    }

    /** Authentication metadata lookup: never serialize this entity or return its verifier. */
    @Transactional(readOnly = true)
    public Client getClientByClientId(String clientId) {
        return clientRepository.findByClientId(clientId).orElseThrow(() -> new InvalidClientException("Invalid client"));
    }

    @Transactional(readOnly = true)
    public List<Client> getAllClients() {
        if (access.isSuperAdmin()) return initializeOrigins(clientRepository.findAll());
        access.requireClientAdmin();
        return initializeOrigins(clientRepository.findByOwnerUserId(access.currentUser().getId()));
    }

    @Transactional(readOnly = true)
    public Page<Client> getAllClients(Pageable page) {
        if (access.isSuperAdmin()) return clientRepository.findAll(page).map(this::initializeOrigins);
        access.requireClientAdmin();
        return clientRepository.findByOwnerUserId(access.currentUser().getId(), page).map(this::initializeOrigins);
    }

    @Transactional
    public Client updateClient(UUID id, String name, String description, List<String> origins, Integer timeout) {
        Client client = getClientById(id);
        validate(name == null ? client.getName() : name, origins == null ? client.getAllowedOrigins() : origins, timeout);
        if (name != null && !name.equals(client.getName()) && clientRepository.existsByName(name)) throw new IllegalArgumentException("Client name already exists");
        if (name != null) client.setName(name);
        if (description != null) { if (description.length() > 1000) throw new IllegalArgumentException("Description too long"); client.setDescription(description); }
        if (origins != null) client.setAllowedOrigins(new ArrayList<>(origins));
        if (timeout != null) client.setIdleTimeout(timeout);
        event(client, EventType.ADMIN_UPDATED, "Client configuration updated");
        return clientRepository.save(client);
    }

    @Transactional
    public Client rotateSecret(UUID id) {
        Client client = getClientById(id);
        String secret = newSecret();
        client.setClientKey(passwordEncoder.encode(secret));
        client.setProvisionedSecret(secret);
        event(client, EventType.ADMIN_UPDATED, "Client secret rotated; previous credential revoked");
        return clientRepository.save(client);
    }

    @Transactional
    public void deactivateClient(UUID id) { changeStatus(id, ClientStatus.INACTIVE); }
    @Transactional
    public void activateClient(UUID id) { changeStatus(id, ClientStatus.ACTIVE); }
    private void changeStatus(UUID id, ClientStatus status) {
        Client client = getClientById(id);
        lockCredentials(client.getClientId());
        client.setStatus(status); clientRepository.save(client);
        if (status != ClientStatus.ACTIVE) {
            refreshTokens.revokeAllClientTokens(client.getClientId());
            sessions.deactivateAllClientSessions(client.getClientId());
        }
        event(client, EventType.ADMIN_UPDATED, "Client status changed to " + status);
    }
    public long getTotalClients() { return getAllClients().size(); }
    public long getActiveClients() { return getAllClients().stream().filter(c -> c.getStatus() == ClientStatus.ACTIVE).count(); }
    @Transactional
    public Client publicRegisterClient(String name, String description, List<String> origins, Integer timeout) { return registerClient(name, description, origins, timeout); }

    private String newSecret() { byte[] bytes = new byte[32]; random.nextBytes(bytes); return "CLIENT_KEY_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private Client initializeOrigins(Client client) {
        if (client.getAllowedOrigins() != null) client.getAllowedOrigins().size();
        return client;
    }
    private List<Client> initializeOrigins(List<Client> clients) {
        clients.forEach(this::initializeOrigins);
        return clients;
    }
    private void event(Client client, EventType type, String detail) {
        var actor = access.currentUser();
        audit.logEvent(type, client.getClientId(), client.getName(), actor.getId(), actor.getEmail(), null, null, 200, detail);
    }
    static void validate(String name, List<String> origins, Integer timeout) {
        if (name == null || name.length() < 3 || name.length() > 100) throw new IllegalArgumentException("Invalid client name");
        if (timeout != null && (timeout < 60 || timeout > 86400)) throw new IllegalArgumentException("Idle timeout must be 60 to 86400 seconds");
        if (origins == null || origins.isEmpty() || origins.size() > 20) throw new IllegalArgumentException("Configure 1 to 20 allowed origins");
        for (String origin : origins) {
            try {
                URI uri = URI.create(origin);
                boolean local = "localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()) || "[::1]".equals(uri.getHost());
                if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                        || !("https".equals(uri.getScheme()) || local && "http".equals(uri.getScheme()))
                        || (uri.getRawPath() != null && !uri.getRawPath().isEmpty())) throw new IllegalArgumentException();
            } catch (RuntimeException ex) { throw new IllegalArgumentException("Allowed origins must be exact HTTPS origins; localhost HTTP is permitted"); }
        }
    }
}
