package com.guardian;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

/** Runs on the isolated local PostgreSQL service, never on an application database. */
@EnabledIfEnvironmentVariable(named = "SHIELD_TEST_POSTGRES_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55432/postgres")
class MigrationPostgresTest {
    private String schema;
    private String url;

    @BeforeEach void createSchema() throws Exception {
        url = System.getenv("SHIELD_TEST_POSTGRES_URL");
        assertThat(url).isEqualTo("jdbc:postgresql://127.0.0.1:55432/postgres");
        schema = "shield_test_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c = connection(); Statement s = c.createStatement()) { s.execute("CREATE SCHEMA " + schema); }
    }

    @AfterEach void removeOnlyDisposableSchema() throws Exception {
        if (schema == null || !schema.matches("shield_test_[a-f0-9]{32}")) return;
        try (Connection c = connection(); Statement s = c.createStatement()) { s.execute("DROP SCHEMA " + schema + " CASCADE"); }
    }
    private Connection connection() throws SQLException { return DriverManager.getConnection(url, "shield_test", ""); }
    private Flyway flyway(boolean baseline) {
        return Flyway.configure().dataSource(url, "shield_test", "").schemas(schema).defaultSchema(schema)
                .baselineOnMigrate(baseline).baselineVersion("1").cleanDisabled(true).load();
    }

    @Test void cleanDatabaseMigratesAndRerunIsIdempotent() throws Exception {
        Flyway flyway = flyway(false);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(3);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        flyway.validate();
        try (Connection c = connection(); Statement s = c.createStatement()) {
            c.setSchema(schema);
            try (ResultSet r = s.executeQuery("SELECT completed FROM platform_bootstrap WHERE id=1")) {
                assertThat(r.next()).isTrue(); assertThat(r.getBoolean(1)).isFalse();
            }
            try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='" + schema + "' AND table_name='email_challenges'")) {
                r.next(); assertThat(r.getInt(1)).isEqualTo(1);
            }
        }
    }

    @Test void existingSchemaIsPreservedAndHistoricCredentialsAreInvalidatedSafely() throws Exception {
        UUID admin = UUID.randomUUID();
        UUID client = UUID.randomUUID();
        try (Connection c = connection(); Statement s = c.createStatement()) {
            c.setSchema(schema);
            ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V1__legacy_schema.sql"));
            s.execute("INSERT INTO users(id,username,email,password_hash,client_id,role,status,created_at) VALUES('" + admin + "','owner','owner@example.test','preserved-password-verifier','GUARDIAN_SYSTEM','GUARDIAN_ADMIN','ACTIVE',CURRENT_TIMESTAMP)");
            s.execute("INSERT INTO clients(id,client_id,client_key,name,status,created_at) VALUES('" + client + "','legacy-app','preserved-encrypted-verifier','Legacy App','ACTIVE',CURRENT_TIMESTAMP)");
            s.execute("INSERT INTO refresh_tokens(id,token,user_id,client_id,expires_at,revoked,created_at) VALUES('" + UUID.randomUUID() + "','raw-refresh-bearer','" + admin + "','GUARDIAN_SYSTEM',CURRENT_TIMESTAMP + INTERVAL '7 days',false,CURRENT_TIMESTAMP)");
            s.execute("INSERT INTO user_sessions(id,user_id,client_id,session_token,created_at,last_active_at,expires_at,active) VALUES('" + UUID.randomUUID() + "','" + admin + "','GUARDIAN_SYSTEM','raw-access-bearer',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '1 hour',true)");
        }
        Flyway flyway = flyway(true);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(2);
        try (Connection c = connection(); Statement s = c.createStatement()) {
            c.setSchema(schema);
            try (ResultSet r = s.executeQuery("SELECT password_hash FROM users WHERE id='" + admin + "'")) {
                r.next(); assertThat(r.getString(1)).isEqualTo("preserved-password-verifier");
            }
            try (ResultSet r = s.executeQuery("SELECT completed FROM platform_bootstrap WHERE id=1")) { r.next(); assertThat(r.getBoolean(1)).isTrue(); }
            try (ResultSet r = s.executeQuery("SELECT owner_user_id,client_key FROM clients WHERE id='" + client + "'")) {
                r.next(); assertThat(r.getObject(1)).isNull(); assertThat(r.getString(2)).isEqualTo("preserved-encrypted-verifier");
            }
            try (ResultSet r = s.executeQuery("SELECT revoked,token FROM refresh_tokens")) {
                r.next(); assertThat(r.getBoolean(1)).isTrue(); assertThat(r.getString(2)).matches("[a-f0-9]{64}");
            }
            try (ResultSet r = s.executeQuery("SELECT active,session_token FROM user_sessions")) {
                r.next(); assertThat(r.getBoolean(1)).isFalse(); assertThat(r.getString(2)).matches("[a-f0-9]{64}");
            }
            // Privileged username uniqueness includes legacy and new platform roles.
            assertThatThrownBy(() -> s.execute("INSERT INTO users(id,username,email,password_hash,role,status,created_at) VALUES('" + UUID.randomUUID() + "','OWNER','other@example.test','hash','SUPER_ADMIN','ACTIVE',CURRENT_TIMESTAMP)"))
                    .isInstanceOf(SQLException.class);
        }
    }
}
