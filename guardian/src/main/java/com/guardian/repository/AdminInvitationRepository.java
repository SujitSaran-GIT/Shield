package com.guardian.repository;
import com.guardian.entity.AdminInvitation;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface AdminInvitationRepository extends JpaRepository<AdminInvitation,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from AdminInvitation i where i.id = :id")
    Optional<AdminInvitation> lockById(UUID id);
}
