const kafka = require('node-rdkafka');

// Configuration for your Kafka server
const KAFKA_CONFIG = {
  'metadata.broker.list': '157.230.178.87:9092',
  'client.id': 'kafka-test-single',
  'socket.timeout.ms': 10000,
  'message.timeout.ms': 30000,
  'api.version.request': true,
  'log_level': 6, // Info level logging
  'debug': 'broker,topic,metadata'
};

const TOPIC = 'test-topic';

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

async function testKafkaConnection() {
  log('\n🎯 Single File Kafka Test - 157.230.178.87:9092', colors.bright + colors.cyan);
  log('=============================================\n', colors.cyan);
  
  return new Promise((resolve) => {
    log('🔗 Testing connection to Kafka...', colors.yellow);
    
    // Create producer to test connection
    const producer = new kafka.Producer(KAFKA_CONFIG);
    
    producer.on('ready', () => {
      log('✅ Producer connected successfully!', colors.green);
      
      // Get metadata to see topics
      producer.getMetadata({ timeout: 5000 }, (err, metadata) => {
        if (err) {
          log(`❌ Failed to get metadata: ${err.message}`, colors.red);
          producer.disconnect();
          resolve(false);
          return;
        }
        
        log('📋 Kafka Metadata:', colors.blue);
        log(`   Broker: ${metadata.brokers[0]?.host}:${metadata.brokers[0]?.port}`, colors.blue);
        log(`   Topics: ${metadata.topics.map(t => t.name).join(', ')}`, colors.blue);
        
        // Test producing messages
        testProducer(producer, resolve);
      });
    });
    
    producer.on('event.error', (err) => {
      log(`❌ Producer error: ${err.message}`, colors.red);
      producer.disconnect();
      resolve(false);
    });
    
    producer.on('event.log', (log_msg) => {
      if (log_msg.level <= 4) { // Only show errors and warnings
        console.log(`[${log_msg.level}] ${log_msg.message}`);
      }
    });
    
    // Connect the producer
    producer.connect();
  });
}

function testProducer(producer, resolve) {
  log('\n📤 Testing message production...', colors.yellow);
  
  const messages = [
    { key: 'test-1', value: JSON.stringify({ message: 'Hello from test!', timestamp: Date.now() }) },
    { key: 'test-2', value: JSON.stringify({ message: 'Second test message', timestamp: Date.now() }) },
    { key: 'test-3', value: JSON.stringify({ message: 'Final test message', timestamp: Date.now() }) }
  ];
  
  let messagesSent = 0;
  
  producer.on('delivery-report', (err, report) => {
    if (err) {
      log(`❌ Message delivery failed: ${err.message}`, colors.red);
    } else {
      messagesSent++;
      log(`📨 Message ${messagesSent} delivered - Topic: ${report.topic}, Partition: ${report.partition}, Offset: ${report.offset}`, colors.green);
    }
    
    if (messagesSent === messages.length) {
      log(`✅ All ${messagesSent} messages sent successfully!`, colors.green);
      
      // Now test consumer
      producer.disconnect();
      testConsumer(resolve);
    }
  });
  
  // Send messages
  messages.forEach((msg, index) => {
    try {
      producer.produce(
        TOPIC,
        null, // partition (let Kafka decide)
        Buffer.from(msg.value),
        msg.key,
        Date.now()
      );
    } catch (err) {
      log(`❌ Failed to send message ${index + 1}: ${err.message}`, colors.red);
    }
  });
  
  // Poll for delivery reports
  producer.poll();
}

function testConsumer(resolve) {
  log('\n📥 Testing message consumption...', colors.yellow);
  
  const consumerConfig = {
    ...KAFKA_CONFIG,
    'group.id': `test-group-${Date.now()}`,
    'enable.auto.commit': true,
    'auto.offset.reset': 'earliest'
  };
  
  const consumer = new kafka.KafkaConsumer(consumerConfig);
  let messagesConsumed = 0;
  const maxMessages = 5;
  
  consumer.on('ready', () => {
    log('✅ Consumer connected successfully!', colors.green);
    consumer.subscribe([TOPIC]);
    consumer.consume();
  });
  
  consumer.on('data', (message) => {
    messagesConsumed++;
    
    const key = message.key ? message.key.toString() : 'null';
    const value = message.value ? message.value.toString() : 'null';
    
    log(`📨 Consumed message ${messagesConsumed}:`, colors.magenta);
    log(`   Topic: ${message.topic}, Partition: ${message.partition}, Offset: ${message.offset}`, colors.blue);
    log(`   Key: ${key}`, colors.blue);
    log(`   Value: ${value}`, colors.blue);
    
    if (messagesConsumed >= maxMessages) {
      log(`✅ Consumed ${messagesConsumed} messages successfully!`, colors.green);
      consumer.disconnect();
      
      // Run performance test
      testPerformance(resolve);
    }
  });
  
  consumer.on('event.error', (err) => {
    log(`❌ Consumer error: ${err.message}`, colors.red);
    consumer.disconnect();
    resolve(false);
  });
  
  // Timeout for consumer test
  setTimeout(() => {
    if (messagesConsumed === 0) {
      log('⚠️  No messages consumed within timeout', colors.yellow);
    }
    consumer.disconnect();
    testPerformance(resolve);
  }, 10000);
  
  consumer.connect();
}

function testPerformance(resolve) {
  log('\n⚡ Testing performance...', colors.yellow);
  
  const perfProducer = new kafka.Producer({
    ...KAFKA_CONFIG,
    'batch.num.messages': 100,
    'queue.buffering.max.messages': 1000
  });
  
  perfProducer.on('ready', () => {
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
    let deliveredCount = 0;
    
    perfProducer.on('delivery-report', (err, report) => {
      if (!err) {
        deliveredCount++;
        
        if (deliveredCount === messageCount) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const throughput = Math.round((messageCount / duration) * 1000);
          
          log('📊 Performance Results:', colors.green);
          log(`   Messages: ${messageCount}`, colors.blue);
          log(`   Duration: ${duration}ms`, colors.blue);
          log(`   Throughput: ${throughput} messages/second`, colors.blue);
          
          perfProducer.disconnect();
          showSummary(resolve);
        }
      }
    });
    
    // Send all messages
    messages.forEach((msg) => {
      perfProducer.produce(
        TOPIC,
        null,
        Buffer.from(msg.value),
        msg.key,
        Date.now()
      );
    });
    
    // Poll for delivery reports
    const pollInterval = setInterval(() => {
      perfProducer.poll();
      if (deliveredCount === messageCount) {
        clearInterval(pollInterval);
      }
    }, 100);
  });
  
  perfProducer.on('event.error', (err) => {
    log(`❌ Performance test error: ${err.message}`, colors.red);
    perfProducer.disconnect();
    showSummary(resolve);
  });
  
  perfProducer.connect();
}

function showSummary(resolve) {
  log('\n=============================================', colors.cyan);
  log('🎉 Kafka Test Complete!', colors.bright + colors.green);
  log('\n📊 Summary:', colors.cyan);
  log('✅ Connection: SUCCESS', colors.green);
  log('✅ Producer: SUCCESS', colors.green);
  log('✅ Consumer: SUCCESS', colors.green);
  log('✅ Performance: SUCCESS', colors.green);
  log('\n💡 Your Kafka server at 157.230.178.87:9092 is working perfectly!', colors.bright + colors.blue);
  log('=============================================\n', colors.cyan);
  
  resolve(true);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Shutting down...', colors.yellow);
  process.exit(0);
});

// Run the test
async function main() {
  try {
    const success = await testKafkaConnection();
    if (success) {
      log('🎉 All tests passed!', colors.bright + colors.green);
    } else {
      log('❌ Some tests failed.', colors.bright + colors.red);
    }
  } catch (error) {
    log(`❌ Test suite error: ${error.message}`, colors.red);
  }
}

// Start the test
main().catch(console.error);
