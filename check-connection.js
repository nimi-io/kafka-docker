#!/usr/bin/env node

const net = require('net');

console.log('🔍 Kafka Connection Diagnostics');
console.log('================================');
console.log(`Target: 157.230.178.87:9092`);
console.log(`Time: ${new Date().toISOString()}\n`);

// Test TCP connectivity
function testTCPConnection(host, port, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        
        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error(`Connection timeout after ${timeout}ms`));
        }, timeout);
        
        socket.connect(port, host, () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('⏳ Testing TCP connection...');
        await testTCPConnection('157.230.178.87', 9092);
        console.log('✅ TCP connection successful');
        
        // If TCP works, try a simple Kafka client test
        console.log('\n⏳ Testing Kafka protocol...');
        const { Kafka } = require('kafkajs');
        
        const kafka = new Kafka({
            clientId: 'diagnostic-client',
            brokers: ['157.230.178.87:9092'],
            connectionTimeout: 5000,
            requestTimeout: 5000
        });
        
        const admin = kafka.admin();
        await admin.connect();
        console.log('✅ Kafka admin connection successful');
        
        const metadata = await admin.describeCluster();
        console.log('📊 Cluster metadata:', JSON.stringify(metadata, null, 2));
        
        await admin.disconnect();
        
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Troubleshooting steps:');
            console.log('1. Verify Kafka service is running in Coolify');
            console.log('2. Check if port 9092 is properly exposed');
            console.log('3. Ensure the service was redeployed with updated configuration');
            console.log('4. Verify firewall/security group settings');
        }
    }
}

main().catch(console.error);
