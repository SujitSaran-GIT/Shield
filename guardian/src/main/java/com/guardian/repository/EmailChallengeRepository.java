package com.guardian.repository;

import com.guardian.entity.EmailChallenge;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface EmailChallengeRepository extends JpaRepository<EmailChallenge, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from EmailChallenge c where c.id = :id")
    Optional<EmailChallenge> lockById(@Param("id") UUID id);
}
