FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
RUN groupadd --system shield && useradd --system --gid shield --home /app shield
WORKDIR /app
COPY --from=build --chown=shield:shield /build/target/guardian-0.0.1-SNAPSHOT.jar /app/guardian.jar
USER shield
EXPOSE 6061
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-Duser.timezone=UTC", "-jar", "/app/guardian.jar"]
