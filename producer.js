const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'kafka-producer-test',
  brokers: ['localhost:9092']
});

const TOPIC = process.argv[2] || 'test-topic';

async function runProducer() {
  const producer = kafka.producer();
  
  console.log('🚀 Starting Kafka Producer...');
  await producer.connect();
  console.log('✅ Producer connected');
  
  try {
    let messageCount = 0;
    
    // Send messages every 2 seconds
    const interval = setInterval(async () => {
      const message = {
        key: `key-${messageCount}`,
        value: JSON.stringify({
          id: messageCount,
          message: `Hello from Producer! Message #${messageCount}`,
          timestamp: new Date().toISOString(),
          random: Math.random()
        })
      };
      
      try {
        const result = await producer.send({
          topic: TOPIC,
          messages: [message]
        });
        
        console.log(`📤 Sent message ${messageCount} to partition ${result[0].partition}, offset ${result[0].baseOffset}`);
        messageCount++;
        
        if (messageCount >= 10) { // Stop after 10 messages
          clearInterval(interval);
          await producer.disconnect();
          console.log('✅ Producer finished and disconnected');
          process.exit(0);
        }
      } catch (sendError) {
        console.error('❌ Error sending message:', sendError.message);
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Producer error:', error.message);
    await producer.disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down producer...');
  process.exit(0);
});

console.log(`📨 Producer will send messages to topic: ${TOPIC}`);
console.log('Press Ctrl+C to stop\n');

runProducer().catch(console.error);
