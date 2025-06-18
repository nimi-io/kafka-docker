# Kafka Coolify Deployment Checklist

## Current Status
- ❌ **Connection Failed**: TCP connection to 157.230.178.87:9092 times out
- ✅ **Configuration Ready**: docker-compose.coolify.yml has correct KAFKA_ADVERTISED_LISTENERS
- ✅ **Test Scripts Ready**: Comprehensive test suite prepared

## Required Actions in Coolify

### 1. Deploy/Redeploy the Kafka Service
Make sure the Kafka service is deployed using the `docker-compose.coolify.yml` configuration:

```yaml
# Key configuration in docker-compose.coolify.yml
kafka:
  image: confluentinc/cp-kafka:7.4.0
  environment:
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://157.230.178.87:9092
    KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
  ports:
    - "9092:9092"
```

### 2. Port Configuration
Ensure port 9092 is properly exposed:
- **Internal container port**: 9092
- **External host port**: 9092
- **Protocol**: TCP
- **Host binding**: 0.0.0.0 (all interfaces)

### 3. Environment Variables Verification
In Coolify, verify these environment variables are set:
```
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://157.230.178.87:9092
KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092
KAFKA_BROKER_ID=1
KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
```

### 4. Service Dependencies
Make sure services start in correct order:
1. Zookeeper (port 2181)
2. Kafka (port 9092)
3. Kafka UI (optional, port 8080)

### 5. Network Configuration
- Ensure the Docker network allows inter-service communication
- Verify external port 9092 is accessible from outside
- Check firewall/security group rules

## Testing Commands (run after deployment)

### Basic Connectivity Test
```bash
node check-connection.js
```

### Comprehensive Kafka Test
```bash
node test-single.js
```

### Individual Component Tests
```bash
# Admin operations
node admin.js

# Producer test
node producer.js

# Consumer test (in separate terminal)
node consumer.js
```

## Expected Results After Fix

### Connection Test Should Show:
```
✅ TCP connection successful
✅ Kafka admin connection successful
📊 Cluster metadata: {
  "brokers": [
    {
      "nodeId": 1,
      "host": "157.230.178.87",
      "port": 9092
    }
  ]
}
```

### Full Test Should Complete:
- ✅ Connection established
- ✅ Topic creation
- ✅ Message production
- ✅ Message consumption
- ✅ Performance metrics

## Troubleshooting

If connection still fails after deployment:

1. **Check Coolify logs** for the Kafka service
2. **Verify Zookeeper** is running and accessible
3. **Test internal connectivity** within the Docker network
4. **Check resource allocation** (CPU/Memory limits)
5. **Verify disk space** for Kafka data persistence

## Next Steps

1. Deploy/redeploy the Kafka service in Coolify using docker-compose.coolify.yml
2. Run `node check-connection.js` to verify basic connectivity
3. Run `node test-single.js` for comprehensive testing
4. If successful, the Kafka cluster will be ready for production use

## File Status
- ✅ docker-compose.yml - Updated with correct advertised listeners
- ✅ docker-compose.coolify.yml - Coolify-specific configuration ready
- ✅ test-single.js - Comprehensive test suite
- ✅ check-connection.js - Connection diagnostics
- ✅ All supporting scripts (producer.js, consumer.js, admin.js)
