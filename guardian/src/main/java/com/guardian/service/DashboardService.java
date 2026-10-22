package com.guardian.service;
import com.guardian.dto.dashboard.*;
import com.guardian.entity.User;
import com.guardian.entity.Client;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class DashboardService {
 private final UserRepository userRepository;
 private final ClientRepository clientRepository;
 private final AuditLogRepository auditLogRepository;
 private final TenantAccess access;
 private final ClientService clients;
 private final UserService users;
 DashboardMetricsDTO platformMetrics() {
  return DashboardMetricsDTO.builder().totalUsers(userRepository.count()).activeUsers(userRepository.countActiveUsers())
   .totalClients(clientRepository.count()).activeClients(clientRepository.countActiveClients()).totalEvents(auditLogRepository.count()).build();
 }
 public DashboardMetricsDTO getMetrics() {
  Scope scope=scope(); boolean global=scope.global(); List<String> ids=scope.ids(); UUID owner=access.currentUser().getId();
  LocalDateTime now=LocalDateTime.now(), start=now.minusDays(30), previous=start.minusDays(30);
  long recentUsers=global?userRepository.countByCreatedAtBetween(start,now):userRepository.countByClientIdInAndCreatedAtBetween(ids,start,now);
  long oldUsers=global?userRepository.countByCreatedAtBetween(previous,start):userRepository.countByClientIdInAndCreatedAtBetween(ids,previous,start);
  long recentClients=global?clientRepository.countByCreatedAtBetween(start,now):clientRepository.countByOwnerUserIdAndCreatedAtBetween(owner,start,now);
  long oldClients=global?clientRepository.countByCreatedAtBetween(previous,start):clientRepository.countByOwnerUserIdAndCreatedAtBetween(owner,previous,start);
  long success=count(scope,EventType.LOGIN_SUCCESS,LocalDateTime.of(1970,1,1,0,0),now), fail=count(scope,EventType.LOGIN_FAILED,LocalDateTime.of(1970,1,1,0,0),now);
  List<Object[]> daily=auditLogRepository.dailyScopedEvents(LocalDate.now().minusDays(29).atStartOfDay(),global,ids);
  return DashboardMetricsDTO.builder().totalUsers(users.getAllUsers(PageRequest.of(0,1)).getTotalElements())
   .activeUsers(global?userRepository.countActiveUsers():userRepository.countByClientIdInAndStatus(ids,User.UserStatus.ACTIVE))
   .totalClients(global?clientRepository.count():clientRepository.countByOwnerUserId(owner))
   .activeClients(global?clientRepository.countActiveClients():clientRepository.countByOwnerUserIdAndStatus(owner,Client.ClientStatus.ACTIVE))
   .userGrowth(recentUsers-oldUsers).clientGrowth(recentClients-oldClients)
   .totalEvents(count(scope,null,LocalDateTime.of(1970,1,1,0,0),now)).eventGrowth(count(scope,null,start,now)-count(scope,null,previous,start))
   .successRate(success+fail==0?null:(int)Math.round(100.0*success/(success+fail))).successRateChange(null)
   .loginData(series(daily,EventType.LOGIN_SUCCESS,30)).registrationData(series(daily,EventType.USER_REGISTRATION_SUCCESS,30)).auditData(series(daily,null,30)).build();
 }
 private Scope scope() { boolean global=access.isSuperAdmin(); if(!global) access.requireClientAdmin(); return new Scope(global,global?List.of():access.authorizedClientIds()); }
 private long count(Scope scope,EventType type,LocalDateTime start,LocalDateTime end) { return auditLogRepository.countScopedEvents(start,end,scope.global(),scope.ids(),type); }
 private List<DashboardMetricsDTO.DateCountData> series(List<Object[]> rows,EventType type,int days) {
  Map<String,Long> counts=new HashMap<>();
  for(Object[] row:rows) if(type==null || row[1]==type) counts.merge(row[0].toString(),((Number)row[2]).longValue(),Long::sum);
  List<DashboardMetricsDTO.DateCountData> result=new ArrayList<>();
  for(LocalDate date=LocalDate.now().minusDays(days-1);!date.isAfter(LocalDate.now());date=date.plusDays(1)) result.add(DashboardMetricsDTO.DateCountData.builder().date(date.toString()).count(counts.getOrDefault(date.toString(),0L)).build());
  return result;
 }
 public ActivityDataDTO getActivityData(int days) {
  Scope scope=scope(); LocalDate first=LocalDate.now().minusDays(days-1);
  List<Object[]> rows=auditLogRepository.dailyScopedEvents(first.atStartOfDay(),scope.global(),scope.ids());
  Map<String,Long> totals=new HashMap<>(),success=new HashMap<>(),failure=new HashMap<>();
  for(Object[] row:rows) { String date=row[0].toString();long count=((Number)row[2]).longValue();totals.merge(date,count,Long::sum); if(row[1]==EventType.LOGIN_SUCCESS)success.merge(date,count,Long::sum);if(row[1]==EventType.LOGIN_FAILED)failure.merge(date,count,Long::sum); }
  List<ActivityDataDTO.DailyActivity> data=new ArrayList<>();
  for(LocalDate date=first;!date.isAfter(LocalDate.now());date=date.plusDays(1)) data.add(ActivityDataDTO.DailyActivity.builder().date(date).eventCount(totals.getOrDefault(date.toString(),0L)).successfulEvents(success.getOrDefault(date.toString(),0L)).failedEvents(failure.getOrDefault(date.toString(),0L)).build());
  return ActivityDataDTO.builder().dailyActivities(data).build();
 }
 public ClientDistributionDTO getClientDistribution() {
  return ClientDistributionDTO.builder().distribution(clients.getAllClients().stream().map(c->ClientDistributionDTO.ClientUserCount.builder().clientName(c.getName()).clientId(c.getClientId()).userCount(userRepository.countByClientId(c.getClientId())).build()).toList()).build();
 }
 private record Scope(boolean global,List<String> ids) {}
}
