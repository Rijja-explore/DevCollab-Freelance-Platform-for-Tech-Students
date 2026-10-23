# syntax=docker/dockerfile:1.6
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Retry transient repository errors (e.g. 502/503 from Maven Central)
ENV MAVEN_OPTS="-Daether.connector.http.retryHandler.count=5 \
  -Daether.connector.http.retryHandler.serviceUnavailable=429,500,502,503,504 \
  -Dmaven.wagon.http.retryHandler.count=5 \
  -Dmaven.wagon.httpconnectionManager.ttlSeconds=120"

# 1) Resolve dependencies in a separate, cacheable layer.
#    The ~/.m2 cache mount persists across builds, so source changes
#    no longer trigger a full re-download from Maven Central.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    for i in 1 2 3; do \
      mvn -q -B dependency:go-offline -Dmaven.test.skip=true && break; \
      echo "Dependency resolution failed (attempt $i), retrying in 10s..."; sleep 10; \
    done

# 2) Build the application (uses the cached repository)
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    for i in 1 2 3; do \
      mvn -q -B -Dmaven.test.skip=true package && break; \
      if [ "$i" = "3" ]; then exit 1; fi; \
      echo "Build failed (attempt $i), retrying in 10s..."; sleep 10; \
    done

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S escrow && adduser -S escrow -G escrow
COPY --from=build /app/target/escrow-service-1.0.0.jar app.jar
RUN chown escrow:escrow app.jar
USER escrow

ENV JAVA_OPTS="\
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseG1GC \
  -XX:+ExitOnOutOfMemoryError \
  -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-docker} -jar app.jar"]
