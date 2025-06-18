#!/usr/bin/env node

const { Kafka } = require('kafkajs');

async function stepByStepTest() {
    console.log('🔧 Step-by-Step Kafka Configuration Test');
    console.log('========================================');
    
    const kafka = new Kafka({
        clientId: 'step-test',
        brokers: ['157.230.178.87:9092'],
        connectionTimeout: 10000,
        requestTimeout: 10000,
    });

    console.log('📡 Step 1: Creating admin client...');
    const admin = kafka.admin();
    
    try {
        console.log('🔌 Step 2: Connecting to admin...');
        await admin.connect();
        console.log('✅ Step 2: Admin connected successfully!');
        
        console.log('📋 Step 3: Testing simple cluster info...');
        try {
            // Try to create a test topic first (this might work even with broker issues)
            await admin.createTopics({
                topics: [{
                    topic: 'test-connection-' + Date.now(),
                    numPartitions: 1,
                    replicationFactor: 1,
                }],
            });
            console.log('✅ Step 3: Topic creation successful!');
        } catch (topicError) {
            console.log('❌ Step 3: Topic creation failed:', topicError.message);
        }
        
        console.log('📝 Step 4: Listing existing topics...');
        try {
            const topics = await admin.listTopics();
            console.log('✅ Step 4: Topics listed successfully!');
            console.log('📋 Found topics:', topics.slice(0, 5)); // Show first 5 topics
        } catch (listError) {
            console.log('❌ Step 4: Topic listing failed:', listError.message);
            console.log('🔍 Error details:', listError.type || listError.constructor.name);
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
        console.error('🔍 Error type:', error.constructor.name);
    } finally {
        console.log('🔌 Step 5: Disconnecting admin...');
        await admin.disconnect();
        console.log('✅ Step 5: Disconnected');
    }
    
    // Now let's try with a producer/consumer to see if that works differently
    console.log('\n🔧 Testing Producer/Consumer Connection');
    console.log('======================================');
    
    try {
        console.log('📤 Creating producer...');
        const producer = kafka.producer();
        await producer.connect();
        console.log('✅ Producer connected!');
        
        console.log('📨 Sending test message...');
        await producer.send({
            topic: 'test-topic',
            messages: [{
                value: 'Test message from diagnostic',
            }],
        });
        console.log('✅ Message sent successfully!');
        
        await producer.disconnect();
        console.log('✅ Producer disconnected');
        
    } catch (producerError) {
        console.log('❌ Producer test failed:', producerError.message);
        console.log('🔍 Error type:', producerError.constructor.name);
    }
}

stepByStepTest()
    .then(() => {
        console.log('\n🎯 Test Summary:');
        console.log('If admin operations work but producer fails, the issue is likely broker discovery.');
        console.log('If everything fails, the Kafka service may need to be restarted with the new config.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Unexpected error:', error);
        process.exit(1);
    });
