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

# Tuning cho Render free tier: ~512MB RAM và ~0.1 CPU. Startup từng vượt port-scan
# timeout của Render → container bị SIGKILL (exit 137) trước khi Tomcat kịp bind port.
#
#   MaxRAMPercentage=60   heap tối đa ~307MB, chừa chỗ cho metaspace/code cache/thread stack.
#                         (75% → heap 384MB + non-heap ~150MB > 512MB → sát trần, GC quần liên tục)
#   MaxMetaspaceSize      chặn metaspace phình không kiểm soát khi Spring nạp hàng nghìn class.
#   UseSerialGC           G1 mặc định spawn nhiều GC thread tranh nhau 0.1 CPU. Heap nhỏ +
#                         CPU ít thì SerialGC nhanh hơn và tốn ít bộ nhớ quản lý hơn.
#   TieredStopAtLevel=1   chỉ JIT tầng C1, bỏ C2. Cắt phần lớn công biên dịch lúc khởi động —
#                         đây là khoản tiết kiệm lớn nhất khi CPU bị bóp.
#   Xss512k               mỗi thread 512KB thay vì 1MB mặc định.
ENTRYPOINT ["java", \
  "-XX:MaxRAMPercentage=60.0", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:+UseSerialGC", \
  "-XX:TieredStopAtLevel=1", \
  "-Xss512k", \
  "-jar", "app.jar"]
