// Install required package: npm install kafkajs

const { Kafka, Partitioners } = require('kafkajs');

// Silence the partitioner warning
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

// Kafka configuration - with improved timeout settings
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['s848kcw0sogkks8gg48o8gos.138.197.129.114.sslip.io:9093'],
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  // Optional: Add logging configuration
  logLevel: 2, // 0 = NOTHING, 1 = ERROR, 2 = WARN, 3 = INFO, 4 = DEBUG
});

// Topic configuration
const TOPIC_NAME = 'my-topic';

// PRODUCER - with Legacy Partitioner to avoid warnings
async function createProducer() {
  const producer = kafka.producer({
    maxInFlightRequests: 1,
    idempotent: true,
    transactionTimeout: 30000,
    createPartitioner: Partitioners.LegacyPartitioner, // Fix partitioner warning
  });

  await producer.connect();
  console.log('Producer connected successfully');

  return producer;
}

async function produceMessages() {
  const producer = await createProducer();

  try {
    // Send single message
    await producer.send({
      topic: TOPIC_NAME,
      messages: [
        {
          key: 'user-1',
          value: JSON.stringify({
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            timestamp: new Date().toISOString()
          }),
          headers: {
            'correlation-id': 'abc123'
          }
        }
      ]
    });

    // Send multiple messages
    const messages = [];
    for (let i = 0; i < 10; i++) {
      messages.push({
        key: `user-${i}`,
        value: JSON.stringify({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          timestamp: new Date().toISOString()
        })
      });
    }

    await producer.send({
      topic: TOPIC_NAME,
      messages: messages
    });

    console.log('Messages sent successfully');
  } catch (error) {
    console.error('Error producing message:', error);
  } finally {
    await producer.disconnect();
  }
}

// CONSUMER - with improved timeout settings
async function createConsumer() {
  const consumer = kafka.consumer({
    groupId: 'my-consumer-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 5000,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  });

  await consumer.connect();
  console.log('Consumer connected successfully');

  return consumer;
}

async function consumeMessages() {
  const consumer = await createConsumer();

  try {
    // Subscribe to topic
    await consumer.subscribe({
      topic: TOPIC_NAME,
      fromBeginning: true // Set to false to only consume new messages
    });

    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageData = {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: JSON.parse(message.value.toString()),
            headers: message.headers,
            timestamp: new Date(parseInt(message.timestamp))
          };

          console.log('Received message:', messageData);

          // Process your message here
          await processMessage(messageData);

        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
  } catch (error) {
    console.error('Error consuming messages:', error);
  }
}

// Message processing function
async function processMessage(messageData) {
  // Add your business logic here
  console.log(`Processing user: ${messageData.value.name}`);
  
  // Simulate some async processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`Processed user: ${messageData.value.name}`);
}

// ADMIN CLIENT (Optional - for topic management)
async function createTopic() {
  const admin = kafka.admin();
  await admin.connect();

  try {
    await admin.createTopics({
      topics: [{
        topic: TOPIC_NAME,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          {
            name: 'cleanup.policy',
            value: 'compact'
          }
        ]
      }]
    });
    console.log(`Topic ${TOPIC_NAME} created successfully`);
  } catch (error) {
    console.log('Topic might already exist:', error.message);
  } finally {
    await admin.disconnect();
  }
}

// MAIN EXECUTION
async function main() {
  try {
    // Create topic (optional)
    await createTopic();

    // Start consumer in background
    console.log('Starting consumer...');
    consumeMessages().catch(console.error);

    // Wait a bit for consumer to be ready
    await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    // Produce messages
    console.log('Producing messages...');
    await produceMessages();

    // Keep the consumer running
    console.log('Consumer is running. Press Ctrl+C to exit.');
    
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// Error handling
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the application
if (require.main === module) {
  main();
}

module.exports = {
  createProducer,
  createConsumer,
  produceMessages,
  consumeMessages,
  processMessage
};