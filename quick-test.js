#!/usr/bin/env node

const { Kafka } = require('kafkajs');

async function quickTest() {
    console.log('🚀 Quick Kafka Connection Test');
    console.log('==============================');
    
    const kafka = new Kafka({
        clientId: 'quick-test',
        brokers: ['157.230.178.87:9092'],
        connectionTimeout: 10000,
        requestTimeout: 10000,
    });

    console.log('📡 Creating admin client...');
    const admin = kafka.admin();
    
    try {
        console.log('🔌 Connecting to admin...');
        await admin.connect();
        console.log('✅ Admin connected successfully!');
        
        console.log('📋 Fetching cluster metadata...');
        const metadata = await admin.fetchTopicMetadata();
        console.log('📊 Cluster metadata:', JSON.stringify(metadata, null, 2));
        
        console.log('📝 Listing topics...');
        const topics = await admin.listTopics();
        console.log('📋 Topics:', topics);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Error details:', error);
    } finally {
        console.log('🔌 Disconnecting admin...');
        await admin.disconnect();
        console.log('✅ Test completed');
    }
}

// Add timeout to prevent hanging
const timeoutId = setTimeout(() => {
    console.log('⏰ Test timed out after 15 seconds');
    process.exit(1);
}, 15000);

quickTest().then(() => {
    clearTimeout(timeoutId);
    process.exit(0);
}).catch((error) => {
    clearTimeout(timeoutId);
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
