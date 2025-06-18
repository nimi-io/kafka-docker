#!/usr/bin/env node

const kafka = require('node-rdkafka');

function testBrokerDiscovery() {
    console.log('🔍 Node-rdkafka Broker Discovery Test');
    console.log('=====================================');
    
    return new Promise((resolve, reject) => {
        const client = new kafka.KafkaConsumer({
            'group.id': 'discovery-test',
            'metadata.broker.list': '157.230.178.87:9092',
            'enable.auto.commit': false,
            'socket.timeout.ms': 10000,
            'session.timeout.ms': 10000,
        });

        const timeout = setTimeout(() => {
            console.log('⏰ Test timed out');
            client.disconnect();
            reject(new Error('Timeout'));
        }, 15000);

        client.on('ready', () => {
            console.log('✅ Consumer ready');
            
            // Get metadata
            client.getMetadata({ timeout: 10000 }, (err, metadata) => {
                clearTimeout(timeout);
                
                if (err) {
                    console.error('❌ Failed to get metadata:', err);
                    client.disconnect();
                    reject(err);
                    return;
                }
                
                console.log('📊 Metadata received!');
                console.log('📋 Brokers:');
                
                metadata.brokers.forEach((broker, index) => {
                    const isReachable = broker.host === '157.230.178.87' || 
                                       (!broker.host.includes('localhost') && 
                                        !broker.host.includes('127.0.0.1') &&
                                        broker.host !== '0.0.0.0');
                    
                    console.log(`  ${index + 1}. ID ${broker.id}: ${broker.host}:${broker.port} ${isReachable ? '✅' : '❌'}`);
                });
                
                console.log('\n📋 Topics:');
                Object.keys(metadata.topics).forEach(topicName => {
                    const topic = metadata.topics[topicName];
                    console.log(`  📄 ${topicName} (${topic.partitions.length} partitions)`);
                });
                
                // Check for problematic brokers
                const problematicBrokers = metadata.brokers.filter(b => 
                    b.host.includes('localhost') || 
                    b.host.includes('127.0.0.1') || 
                    b.host === '0.0.0.0'
                );
                
                if (problematicBrokers.length > 0) {
                    console.log('\n⚠️  PROBLEM DETECTED:');
                    console.log('Kafka is advertising unreachable broker addresses:');
                    problematicBrokers.forEach(broker => {
                        console.log(`  ❌ Broker ${broker.id}: ${broker.host}:${broker.port}`);
                    });
                    console.log('\n💡 The KAFKA_ADVERTISED_LISTENERS configuration still needs to be fixed.');
                } else {
                    console.log('\n✅ All brokers are advertising reachable addresses!');
                }
                
                client.disconnect();
                resolve(metadata);
            });
        });

        client.on('connection.failure', (err) => {
            clearTimeout(timeout);
            console.error('❌ Connection failed:', err);
            reject(err);
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            console.error('❌ Consumer error:', err);
            reject(err);
        });

        console.log('🔌 Connecting to Kafka...');
        client.connect();
    });
}

testBrokerDiscovery()
    .then(() => {
        console.log('✅ Discovery test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Discovery test failed:', error.message);
        process.exit(1);
    });
