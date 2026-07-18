# syntax=docker/dockerfile:1

# ─────────────────────────── Build stage ───────────────────────────
# Dùng image maven có sẵn (không dùng ./mvnw) để tránh lỗi CRLF của mvnw khi build trên Linux.
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom + source rồi package luôn. Dependency được tải trong bước package khi cần.
# (Không tách `dependency:go-offline` riêng: bước đó resolve toàn bộ cây plugin+dep, ngốn RAM
#  gây rớt daemon khi build trên máy đang chạy IDE/app — nặng hơn lợi ích cache.)
# Bỏ test vì test cần DB/Redis thật (chạy ở CI/local, không ở image build).
COPY pom.xml .
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ─────────────────────────── Runtime stage ───────────────────────────
# JRE alpine gọn hơn JDK — image nhỏ, khởi động nhanh.
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tên jar = artifactId-version (backend-0.0.1-SNAPSHOT) theo pom.xml.
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Tài liệu hóa cổng mặc định; cloud sẽ override qua biến PORT (app đọc server.port=${PORT:8080}).
EXPOSE 8080

# MaxRAMPercentage: JVM 17 tự nhận giới hạn RAM của container (free tier ~512MB) → cấp heap theo %.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
