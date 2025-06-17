# Kafka Docker Setup

This repository contains a complete Apache Kafka setup using Docker Compose, including Zookeeper, Kafka broker, Schema Registry, and Kafka UI for easy management.

## Components

- **Zookeeper**: Coordination service for Kafka
- **Kafka**: Message broker
- **Schema Registry**: Manages Avro schemas
- **Kafka UI**: Web interface for Kafka management

## Quick Start

1. Start the entire Kafka stack:
   ```bash
   docker-compose up -d
   ```

2. Check if all services are running:
   ```bash
   docker-compose ps
   ```

3. View logs:
   ```bash
   docker-compose logs -f kafka
   ```

## Access Points

- **Kafka Broker**: `localhost:9092`
- **Kafka UI**: http://localhost:8080
- **Schema Registry**: http://localhost:8081
- **Zookeeper**: `localhost:2181`

## Common Commands

### Create a Topic
```bash
docker exec -it kafka kafka-topics --create --topic my-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### List Topics
```bash
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Produce Messages
```bash
docker exec -it kafka kafka-console-producer --topic my-topic --bootstrap-server localhost:9092
```

### Consume Messages
```bash
docker exec -it kafka kafka-console-consumer --topic my-topic --bootstrap-server localhost:9092 --from-beginning
```

### Delete a Topic
```bash
docker exec -it kafka kafka-topics --delete --topic my-topic --bootstrap-server localhost:9092
```

## Configuration

### Environment Variables

The setup includes optimized configurations for:
- **Auto-creation of topics**: Enabled
- **Log retention**: 7 days (168 hours)
- **JMX monitoring**: Enabled on port 9101
- **Health checks**: Automatic service health monitoring

### Volumes

Persistent data is stored in Docker volumes:
- `zookeeper-data`: Zookeeper data
- `zookeeper-logs`: Zookeeper transaction logs
- `kafka-data`: Kafka logs and data

## Scaling

To run multiple Kafka brokers, you can scale the setup:

```bash
docker-compose up -d --scale kafka=3
```

Note: You'll need to modify the configuration for multiple brokers in a production environment.

## Troubleshooting

### Check Service Health
```bash
# Check Kafka broker health
docker exec -it kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Check if Kafka is responding
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Reset Data
To completely reset all data:
```bash
docker-compose down -v
docker-compose up -d
```

### View Container Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs kafka
docker-compose logs zookeeper
```

## Production Considerations

For production use, consider:
1. Setting up multiple Kafka brokers for high availability
2. Configuring proper authentication and authorization
3. Setting up monitoring and alerting
4. Tuning JVM settings for your workload
5. Using external volumes for data persistence
6. Setting up SSL/TLS encryption

## Custom Configuration

To use custom Kafka configurations:
1. Create a `config/` directory
2. Add your custom `server.properties` file
3. Uncomment the COPY line in the Dockerfile
4. Rebuild the custom image:
   ```bash
   docker build -t my-kafka .
   ```

## Cleanup

To stop and remove all containers:
```bash
docker-compose down
```

To remove all data volumes as well:
```bash
docker-compose down -v
```
