# ==============================================================================
# Multi-stage Dockerfile for SmartWard AI Spring Boot 3.3 Backend
# Target: Production-ready JRE 21 with Zero-Cost Memory Footprint (<= 512MB RAM)
# ==============================================================================

# Stage 1: Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Cache Maven dependencies
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B || true

# Copy source code and build executable jar
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Minimal Runtime Image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Zero-Cost RAM optimization JVM flags
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Xmx512m -Xms128m -Djava.security.egd=file:/dev/./urandom"

# Create unprivileged system user for security compliance
RUN addgroup -S smartward && adduser -S smartward -G smartward
USER smartward:smartward

# Copy artifact from build stage
COPY --from=builder /workspace/target/smartward-backend-*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
