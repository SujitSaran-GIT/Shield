package com.guardian.service;

import com.guardian.dto.NotificationDTO;
import com.guardian.entity.Notification;
import com.guardian.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(UUID userId, String title, String message, String type) {
        return createNotification(userId, title, message, type, null, null);
    }

    @Transactional
    public Notification createNotification(UUID userId, String title, String message, String type,
                                         String actionUrl, String metadata) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .actionUrl(actionUrl)
                .metadata(metadata)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Notification created for user {}: {}", userId, title);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getUserNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        int updated = notificationRepository.markAsReadByIdAndUserId(
                notificationId, userId, LocalDateTime.now());
        if (updated > 0) {
            log.info("Notification {} marked as read for user {}", notificationId, userId);
        }
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        int updated = notificationRepository.markAllAsReadByUserId(userId, LocalDateTime.now());
        log.info("Marked {} notifications as read for user {}", updated, userId);
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getRecentNotifications(UUID userId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return notificationRepository.findRecentByUserId(userId, since)
                .stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this notification");
        }

        notificationRepository.delete(notification);
        log.info("Notification {} deleted for user {}", notificationId, userId);
    }
}
