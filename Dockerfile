# Dockerfile for Kafka with additional tools
FROM confluentinc/cp-kafka:7.4.0

# Install additional utilities
USER root
RUN yum update -y && \
    yum install -y \
    curl \
    wget \
    vim \
    jq \
    && yum clean all

# Create kafka user and set permissions
RUN groupadd -r kafka && useradd -r -g kafka kafka

# Set working directory
WORKDIR /opt/kafka

# Copy any custom configuration files (if needed)
# COPY config/ /etc/kafka/

# Set proper ownership
RUN chown -R kafka:kafka /opt/kafka

# Switch to kafka user
USER kafka

# Expose Kafka port
EXPOSE 9092

# Default command (can be overridden in docker-compose)
CMD ["kafka-server-start", "/etc/kafka/server.properties"]
