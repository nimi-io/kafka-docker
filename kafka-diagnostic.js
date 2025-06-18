const kafka = require('node-rdkafka');

// Diagnostic script to understand the Kafka server configuration
log('\n🔍 Kafka Diagnostic Tool - 157.230.178.87:9092');
log('==============================================\n');

function log(message) {
  console.log(message);
}

// Test 1: Basic connection and metadata
function testBasicConnection() {
  return new Promise((resolve) => {
    log('🔗 Test 1: Basic Connection & Metadata');
    
    const producer = new kafka.Producer({
      'metadata.broker.list': '157.230.178.87:9092',
      'client.id': 'diagnostic',
      'socket.timeout.ms': 5000,
      'log_level': 1 // Only errors
    });
    
    producer.on('ready', () => {
      log('✅ Connected successfully!');
      
      producer.getMetadata({ timeout: 3000 }, (err, metadata) => {
        if (err) {
          log(`❌ Metadata error: ${err.message}`);
          producer.disconnect();
          resolve({ success: false, error: err.message });
          return;
        }
        
        log('📋 Metadata received:');
        log(`   Original broker: 157.230.178.87:9092`);
        
        metadata.brokers.forEach((broker, i) => {
          log(`   Discovered broker ${i + 1}: ${broker.host}:${broker.port}`);
        });
        
        log(`   Available topics: ${metadata.topics.map(t => t.name).slice(0, 5).join(', ')}${metadata.topics.length > 5 ? '...' : ''}`);
        
        producer.disconnect();
        resolve({ 
          success: true, 
          originalBroker: '157.230.178.87:9092',
          discoveredBrokers: metadata.brokers.map(b => `${b.host}:${b.port}`),
          topics: metadata.topics.map(t => t.name)
        });
      });
    });
    
    producer.on('event.error', (err) => {
      log(`❌ Connection failed: ${err.message}`);
      producer.disconnect();
      resolve({ success: false, error: err.message });
    });
    
    producer.connect();
  });
}

// Test 2: Simple produce test with timeout
function testSimpleProduce() {
  return new Promise((resolve) => {
    log('\n📤 Test 2: Simple Message Production');
    
    const producer = new kafka.Producer({
      'metadata.broker.list': '157.230.178.87:9092',
      'client.id': 'diagnostic-producer',
      'socket.timeout.ms': 3000,
      'request.timeout.ms': 5000,
      'log_level': 1
    });
    
    let messageDelivered = false;
    
    producer.on('ready', () => {
      log('✅ Producer ready');
      
      producer.on('delivery-report', (err, report) => {
        if (err) {
          log(`❌ Delivery failed: ${err.message}`);
        } else {
          log(`✅ Message delivered to ${report.topic}:${report.partition}:${report.offset}`);
          messageDelivered = true;
        }
        producer.disconnect();
        resolve({ success: messageDelivered });
      });
      
      try {
        producer.produce(
          'test-diagnostic',
          null,
          Buffer.from(JSON.stringify({ test: 'diagnostic message', time: Date.now() })),
          'diagnostic-key',
          Date.now()
        );
        log('📤 Message queued for delivery');
        producer.poll();
      } catch (err) {
        log(`❌ Produce failed: ${err.message}`);
        producer.disconnect();
        resolve({ success: false, error: err.message });
      }
    });
    
    producer.on('event.error', (err) => {
      log(`❌ Producer error: ${err.message}`);
      if (!messageDelivered) {
        producer.disconnect();
        resolve({ success: false, error: err.message });
      }
    });
    
    // Timeout
    setTimeout(() => {
      if (!messageDelivered) {
        log('⏰ Produce test timeout');
        producer.disconnect();
        resolve({ success: false, error: 'timeout' });
      }
    }, 10000);
    
    producer.connect();
  });
}

// Test 3: Check if we can work with only the original broker
function testSingleBrokerMode() {
  return new Promise((resolve) => {
    log('\n🔧 Test 3: Single Broker Mode (No Discovery)');
    
    // Try to minimize broker discovery
    const producer = new kafka.Producer({
      'metadata.broker.list': '157.230.178.87:9092',
      'client.id': 'single-broker-test',
      'socket.timeout.ms': 8000,
      'metadata.max.age.ms': 300000, // 5 minutes - reduce metadata refresh
      'topic.metadata.refresh.interval.ms': 300000,
      'log_level': 1
    });
    
    let testComplete = false;
    
    producer.on('ready', () => {
      log('✅ Single broker producer ready');
      
      // Don't get metadata, just try to produce
      producer.on('delivery-report', (err, report) => {
        testComplete = true;
        if (err) {
          log(`❌ Single broker delivery failed: ${err.message}`);
          resolve({ success: false, error: err.message });
        } else {
          log(`✅ Single broker delivery successful!`);
          resolve({ success: true });
        }
        producer.disconnect();
      });
      
      try {
        producer.produce(
          'test-single-broker',
          null,
          Buffer.from('Single broker test message'),
          'single-test',
          Date.now()
        );
        producer.poll();
      } catch (err) {
        log(`❌ Single broker produce failed: ${err.message}`);
        producer.disconnect();
        resolve({ success: false, error: err.message });
      }
    });
    
    producer.on('event.error', (err) => {
      if (!testComplete) {
        log(`❌ Single broker error: ${err.message}`);
      }
    });
    
    setTimeout(() => {
      if (!testComplete) {
        log('⏰ Single broker test timeout');
        producer.disconnect();
        resolve({ success: false, error: 'timeout' });
      }
    }, 15000);
    
    producer.connect();
  });
}

// Run all diagnostic tests
async function runDiagnostics() {
  try {
    const test1 = await testBasicConnection();
    const test2 = await testSimpleProduce();
    const test3 = await testSingleBrokerMode();
    
    log('\n==============================================');
    log('🔍 DIAGNOSTIC SUMMARY');
    log('==============================================');
    
    log(`\n📊 Results:`);
    log(`   Basic Connection: ${test1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    log(`   Simple Produce:   ${test2.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    log(`   Single Broker:    ${test3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (test1.success) {
      log(`\n🔍 Configuration Analysis:`);
      log(`   Your Kafka server: 157.230.178.87:9092`);
      log(`   Discovered brokers: ${test1.discoveredBrokers.join(', ')}`);
      
      const hasLocalhostBroker = test1.discoveredBrokers.some(b => b.includes('localhost'));
      if (hasLocalhostBroker) {
        log(`   ⚠️  ISSUE: Server advertises localhost brokers`);
        log(`   💡 SOLUTION: Configure KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://157.230.178.87:9092`);
      } else {
        log(`   ✅ Broker configuration looks good`);
      }
    }
    
    if (test2.success || test3.success) {
      log(`\n✅ GOOD NEWS: Your Kafka server IS working!`);
      log(`   The connection errors you see are due to broker discovery issues.`);
      log(`   You can work around this by using the original broker address.`);
    } else {
      log(`\n❌ ISSUE: No successful message delivery`);
      log(`   This suggests a more fundamental connectivity problem.`);
    }
    
    log(`\n🔧 Recommended Actions:`);
    log(`   1. Update your Coolify Kafka configuration:`);
    log(`      KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://157.230.178.87:9092`);
    log(`   2. Restart your Kafka service after the change`);
    log(`   3. Use client configurations that minimize broker discovery`);
    
    log('\n==============================================\n');
    
  } catch (error) {
    log(`❌ Diagnostic error: ${error.message}`);
  }
}

runDiagnostics();
