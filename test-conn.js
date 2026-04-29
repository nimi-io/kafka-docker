const { Kafka } = require('kafkajs');

async function testKafkaConnection() {
    const kafka = new Kafka({
        clientId: 'test-client',
        brokers: ['i0k00ckoc8kgc0ck8gok48og.157.245.36.213.sslip.io:9093'],
        connectionTimeout: 10000,
        requestTimeout: 30000,
    });

    const admin = kafka.admin();
    
    try {
        console.log('Attempting to connect to Kafka...');
        await admin.connect();
        console.log('✅ Successfully connected to Kafka!');
        
        const metadata = await admin.fetchTopicMetadata();
        console.log('📋 Available topics:', metadata.topics.map(t => t.name));
        
    } catch (error) {
        console.error('❌ Failed to connect to Kafka:', error.message);
        console.error('Error details:', error);
    } finally {
        try {
            await admin.disconnect();
            console.log('Disconnected from Kafka');
        } catch (err) {
            console.error('Error disconnecting:', err.message);
        }
    }
}

testKafkaConnection();