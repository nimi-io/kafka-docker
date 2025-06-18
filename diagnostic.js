#!/usr/bin/env node

const { Kafka, logLevel } = require('kafkajs');

async function detailedDiagnostic() {
    console.log('🔍 Detailed Kafka Diagnostic Test');
    console.log('=================================');
    
    // Enable debug logging
    const kafka = new Kafka({
        clientId: 'diagnostic-test',
        brokers: ['157.230.178.87:9092'],
        connectionTimeout: 15000,
        requestTimeout: 15000,
        logLevel: logLevel.DEBUG,
        logCreator: () => ({ level, log }) => {
            console.log(`[${level}] ${log.message}`);
            if (log.broker) {
                console.log(`  📍 Broker: ${log.broker}`);
            }
            if (log.brokers) {
                console.log(`  📍 Brokers: ${JSON.stringify(log.brokers)}`);
            }
        }
    });

    console.log('📡 Creating admin client...');
    const admin = kafka.admin();
    
    try {
        console.log('🔌 Connecting to admin...');
        await admin.connect();
        console.log('✅ Admin connected successfully!');
        
        // Try to get broker info first
        console.log('🌐 Attempting to discover brokers...');
        const cluster = kafka.cluster;
        console.log('🔧 Cluster object:', !!cluster);
        
        // Try a simple operation that requires broker discovery
        console.log('📝 Listing topics (this triggers broker discovery)...');
        const topics = await admin.listTopics();
        console.log('📋 Topics found:', topics);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('🔍 Error type:', error.constructor.name);
        
        if (error.cause) {
            console.error('🔗 Caused by:', error.cause.message);
            console.error('🔍 Cause type:', error.cause.constructor.name);
        }
        
        // Check if we can access cluster info
        try {
            const cluster = kafka.cluster();
            console.log('🌐 Cluster state available:', !!cluster);
        } catch (clusterError) {
            console.error('🌐 Cluster error:', clusterError.message);
        }
    } finally {
        console.log('🔌 Disconnecting admin...');
        await admin.disconnect();
        console.log('✅ Diagnostic completed');
    }
}

// Add timeout
const timeoutId = setTimeout(() => {
    console.log('⏰ Diagnostic timed out after 20 seconds');
    process.exit(1);
}, 20000);

detailedDiagnostic().then(() => {
    clearTimeout(timeoutId);
    process.exit(0);
}).catch((error) => {
    clearTimeout(timeoutId);
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
