package com.guardian.repository;
import com.guardian.entity.PlatformBootstrap;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface PlatformBootstrapRepository extends JpaRepository<PlatformBootstrap,Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from PlatformBootstrap b where b.id = 1")
    Optional<PlatformBootstrap> lockState();
}
