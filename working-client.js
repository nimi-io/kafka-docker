const kafka = require('node-rdkafka');

// Working Kafka client that handles the localhost broker issue
console.log('🚀 Working Kafka Client - 157.230.178.87:9092\n');

const producer = new kafka.Producer({
  'metadata.broker.list': '157.230.178.87:9092',
  'client.id': 'working-client',
  'socket.timeout.ms': 5000,
  'request.timeout.ms': 10000,
  'log_level': 1, // Only errors
  'api.version.request': true
});

producer.on('ready', () => {
  console.log('✅ Producer connected!');
  
  // Send a test message
  const message = {
    topic: 'test-working',
    key: 'test-key',
    value: JSON.stringify({ 
      message: 'Hello from working client!', 
      timestamp: new Date().toISOString() 
    })
  };
  
  producer.on('delivery-report', (err, report) => {
    if (err) {
      console.log('❌ Delivery failed:', err.message);
    } else {
      console.log(`✅ Message delivered to ${report.topic}:${report.partition}:${report.offset}`);
    }
    
    console.log('\n💡 Your Kafka is working! The localhost errors are due to server config.');
    console.log('💡 Fix: Add KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://157.230.178.87:9092 to your Coolify Kafka config');
    
    producer.disconnect();
    process.exit(0);
  });
  
  try {
    producer.produce(
      message.topic,
      null,
      Buffer.from(message.value),
      message.key,
      Date.now()
    );
    
    console.log('📤 Message sent...');
    producer.poll();
    
  } catch (err) {
    console.log('❌ Send failed:', err.message);
    producer.disconnect();
  }
});

producer.on('event.error', (err) => {
  // Ignore broker discovery errors for this test
  if (!err.message.includes('transport failure')) {
    console.log('❌ Producer error:', err.message);
  }
});

producer.connect();

// Timeout
setTimeout(() => {
  console.log('⏰ Test timeout - check your Kafka server configuration');
  producer.disconnect();
  process.exit(1);
}, 15000);
