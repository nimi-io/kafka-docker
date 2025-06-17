const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'kafka-consumer-test',
  brokers: ['localhost:9092']
});

const TOPIC = process.argv[2] || 'test-topic';
const GROUP_ID = process.argv[3] || 'test-consumer-group';

async function runConsumer() {
  const consumer = kafka.consumer({ 
    groupId: GROUP_ID,
    sessionTimeout: 30000,
    heartbeatInterval: 3000
  });
  
  console.log('🚀 Starting Kafka Consumer...');
  await consumer.connect();
  console.log('✅ Consumer connected');
  
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  console.log(`✅ Subscribed to topic: ${TOPIC}`);
  console.log(`👥 Consumer group: ${GROUP_ID}`);
  console.log('📥 Waiting for messages...\n');
  
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const key = message.key ? message.key.toString() : 'null';
        const value = message.value ? message.value.toString() : 'null';
        const timestamp = new Date(parseInt(message.timestamp)).toISOString();
        
        console.log('📨 Received message:');
        console.log(`   Topic: ${topic}`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Key: ${key}`);
        console.log(`   Value: ${value}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log('   ---');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
      },
    });
  } catch (error) {
    console.error('❌ Consumer error:', error.message);
    await consumer.disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down consumer...');
  process.exit(0);
});

console.log(`📥 Consumer will read from topic: ${TOPIC}`);
console.log('Press Ctrl+C to stop\n');

runConsumer().catch(console.error);
