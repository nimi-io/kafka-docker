const { Kafka } = require('kafkajs');
require('dotenv').config();

// Kafka configuration
const kafka = new Kafka({
  clientId: 'kafka-test-app',
  brokers: ['localhost:9092'], // Using the port from your setup
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Test topic name
const TEST_TOPIC = 'test-topic';

async function testKafkaConnection() {
  log('🚀 Starting Kafka Connection Test...', colors.cyan);
  
  try {
    // Test admin client
    const admin = kafka.admin();
    await admin.connect();
    log('✅ Admin client connected successfully', colors.green);
    
    // List existing topics
    const existingTopics = await admin.listTopics();
    log(`📋 Existing topics: ${existingTopics.join(', ') || 'None'}`, colors.blue);
    
    // Create test topic if it doesn't exist
    if (!existingTopics.includes(TEST_TOPIC)) {
      log(`📝 Creating topic: ${TEST_TOPIC}`, colors.yellow);
      await admin.createTopics({
        topics: [{
          topic: TEST_TOPIC,
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: 'cleanup.policy', value: 'delete' },
            { name: 'retention.ms', value: '86400000' } // 24 hours
          ]
        }]
      });
      log('✅ Topic created successfully', colors.green);
    } else {
      log(`ℹ️  Topic ${TEST_TOPIC} already exists`, colors.blue);
    }
    
    await admin.disconnect();
    
    return true;
  } catch (error) {
    log(`❌ Admin client error: ${error.message}`, colors.red);
    return false;
  }
}

async function testProducer() {
  log('\n📤 Testing Kafka Producer...', colors.cyan);
  
  try {
    const producer = kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });
    
    await producer.connect();
    log('✅ Producer connected successfully', colors.green);
    
    // Send test messages
    const messages = [
      { key: 'user-1', value: JSON.stringify({ id: 1, name: 'Alice', action: 'login' }) },
      { key: 'user-2', value: JSON.stringify({ id: 2, name: 'Bob', action: 'purchase' }) },
      { key: 'user-3', value: JSON.stringify({ id: 3, name: 'Charlie', action: 'logout' }) },
      { key: 'user-1', value: JSON.stringify({ id: 1, name: 'Alice', action: 'logout' }) }
    ];
    
    for (let i = 0; i < messages.length; i++) {
      const result = await producer.send({
        topic: TEST_TOPIC,
        messages: [messages[i]]
      });
      
      log(`📨 Message ${i + 1} sent - Partition: ${result[0].partition}, Offset: ${result[0].baseOffset}`, colors.green);
    }
    
    // Send batch messages
    const batchMessages = Array.from({ length: 10 }, (_, i) => ({
      key: `batch-${i}`,
      value: JSON.stringify({ 
        id: i, 
        timestamp: Date.now(), 
        data: `Batch message ${i}` 
      })
    }));
    
    const batchResult = await producer.send({
      topic: TEST_TOPIC,
      messages: batchMessages
    });
    
    log(`📦 Batch of ${batchMessages.length} messages sent successfully`, colors.green);
    
    await producer.disconnect();
    log('✅ Producer disconnected', colors.green);
    
    return true;
  } catch (error) {
    log(`❌ Producer error: ${error.message}`, colors.red);
    return false;
  }
}

async function testConsumer() {
  log('\n📥 Testing Kafka Consumer...', colors.cyan);
  
  try {
    const consumer = kafka.consumer({ 
      groupId: 'test-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    
    await consumer.connect();
    log('✅ Consumer connected successfully', colors.green);
    
    await consumer.subscribe({ topic: TEST_TOPIC, fromBeginning: true });
    log(`✅ Subscribed to topic: ${TEST_TOPIC}`, colors.green);
    
    let messageCount = 0;
    const maxMessages = 15; // Limit messages for testing
    
    // Set up a timeout to stop consuming after a certain time
    const timeout = setTimeout(() => {
      log('\n⏰ Consumer timeout reached', colors.yellow);
      consumer.stop();
    }, 10000); // 10 seconds timeout
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageCount++;
        
        const key = message.key ? message.key.toString() : 'null';
        const value = message.value ? message.value.toString() : 'null';
        
        log(`📨 Consumed message ${messageCount}:`, colors.magenta);
        log(`   Topic: ${topic}, Partition: ${partition}, Offset: ${message.offset}`, colors.blue);
        log(`   Key: ${key}`, colors.blue);
        log(`   Value: ${value}`, colors.blue);
        log(`   Timestamp: ${new Date(parseInt(message.timestamp)).toISOString()}`, colors.blue);
        
        // Stop after consuming enough messages for the test
        if (messageCount >= maxMessages) {
          clearTimeout(timeout);
          await consumer.stop();
          log('\n✅ Finished consuming test messages', colors.green);
        }
      },
    });
    
    await consumer.disconnect();
    log('✅ Consumer disconnected', colors.green);
    
    return messageCount > 0;
  } catch (error) {
    log(`❌ Consumer error: ${error.message}`, colors.red);
    return false;
  }
}

async function testPerformance() {
  log('\n⚡ Running Performance Test...', colors.cyan);
  
  try {
    const producer = kafka.producer();
    await producer.connect();
    
    const messageCount = 1000;
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      key: `perf-${i}`,
      value: JSON.stringify({
        id: i,
        timestamp: Date.now(),
        data: 'x'.repeat(100) // 100 character payload
      })
    }));
    
    const startTime = Date.now();
    
    // Send messages in batches
    const batchSize = 100;
    for (let i = 0; i < messageCount; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await producer.send({
        topic: TEST_TOPIC,
        messages: batch
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = Math.round((messageCount / duration) * 1000);
    
    log(`📊 Performance Results:`, colors.green);
    log(`   Messages: ${messageCount}`, colors.blue);
    log(`   Duration: ${duration}ms`, colors.blue);
    log(`   Throughput: ${throughput} messages/second`, colors.blue);
    
    await producer.disconnect();
    
    return true;
  } catch (error) {
    log(`❌ Performance test error: ${error.message}`, colors.red);
    return false;
  }
}

async function cleanupTestTopic() {
  log('\n🧹 Cleaning up test topic...', colors.cyan);
  
  try {
    const admin = kafka.admin();
    await admin.connect();
    
    await admin.deleteTopics({
      topics: [TEST_TOPIC],
      timeout: 5000
    });
    
    log('✅ Test topic deleted successfully', colors.green);
    
    await admin.disconnect();
    return true;
  } catch (error) {
    if (error.message.includes('UnknownTopicOrPartitionError')) {
      log('ℹ️  Test topic was already deleted or does not exist', colors.blue);
      return true;
    }
    log(`❌ Cleanup error: ${error.message}`, colors.red);
    return false;
  }
}

// Main test function
async function runKafkaTests() {
  log('🎯 Kafka Test Suite Started', colors.bright + colors.cyan);
  log('================================\n', colors.cyan);
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Connection and Admin
    const connectionTest = await testKafkaConnection();
    if (!connectionTest) {
      allTestsPassed = false;
      log('\n❌ Connection test failed. Make sure Kafka is running!', colors.red);
      return;
    }
    
    // Test 2: Producer
    const producerTest = await testProducer();
    if (!producerTest) {
      allTestsPassed = false;
    }
    
    // Test 3: Consumer
    const consumerTest = await testConsumer();
    if (!consumerTest) {
      allTestsPassed = false;
    }
    
    // Test 4: Performance
    const performanceTest = await testPerformance();
    if (!performanceTest) {
      allTestsPassed = false;
    }
    
    // Cleanup (optional - comment out if you want to keep the topic)
    // await cleanupTestTopic();
    
  } catch (error) {
    log(`❌ Test suite error: ${error.message}`, colors.red);
    allTestsPassed = false;
  }
  
  // Summary
  log('\n================================', colors.cyan);
  if (allTestsPassed) {
    log('🎉 ALL TESTS PASSED! Kafka is working correctly.', colors.bright + colors.green);
  } else {
    log('❌ Some tests failed. Check the output above.', colors.bright + colors.red);
  }
  log('================================\n', colors.cyan);
}

// Handle cleanup on process exit
process.on('SIGINT', async () => {
  log('\n👋 Received SIGINT, cleaning up...', colors.yellow);
  await cleanupTestTopic();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('\n👋 Received SIGTERM, cleaning up...', colors.yellow);
  await cleanupTestTopic();
  process.exit(0);
});

// Run the tests if this file is executed directly
if (require.main === module) {
  runKafkaTests().catch(console.error);
}

module.exports = {
  runKafkaTests,
  testKafkaConnection,
  testProducer,
  testConsumer,
  testPerformance,
  cleanupTestTopic
};
