#!/usr/bin/env node

const net = require('net');

// Simple Kafka protocol parser to inspect metadata response
class KafkaMetadataInspector {
    static async inspectBrokerMetadata(host, port) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            
            socket.setTimeout(10000);
            
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            });
            
            socket.on('error', (err) => {
                reject(err);
            });
            
            socket.connect(port, host, () => {
                console.log(`✅ Connected to ${host}:${port}`);
                
                // Send API Versions request first (required for newer Kafka)
                const apiVersionsRequest = this.createApiVersionsRequest();
                socket.write(apiVersionsRequest);
                
                let responseBuffer = Buffer.alloc(0);
                let waitingForMetadata = false;
                
                socket.on('data', (data) => {
                    responseBuffer = Buffer.concat([responseBuffer, data]);
                    
                    if (!waitingForMetadata) {
                        // Wait for API versions response, then send metadata request
                        if (responseBuffer.length >= 4) {
                            const responseLength = responseBuffer.readInt32BE(0);
                            if (responseBuffer.length >= 4 + responseLength) {
                                console.log('📡 API Versions response received');
                                
                                // Send metadata request
                                const metadataRequest = this.createMetadataRequest();
                                socket.write(metadataRequest);
                                waitingForMetadata = true;
                                responseBuffer = Buffer.alloc(0); // Reset buffer for metadata response
                            }
                        }
                    } else {
                        // Parse metadata response
                        if (responseBuffer.length >= 4) {
                            const responseLength = responseBuffer.readInt32BE(0);
                            if (responseBuffer.length >= 4 + responseLength) {
                                console.log('📊 Metadata response received');
                                const brokers = this.parseMetadataResponse(responseBuffer);
                                socket.destroy();
                                resolve(brokers);
                            }
                        }
                    }
                });
            });
        });
    }
    
    static createApiVersionsRequest() {
        // Simple API Versions request (API key 18, version 2)
        const correlationId = 1;
        const clientId = 'inspector';
        
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Request length (will be filled later)
        offset += 4;
        
        // API key (18 for ApiVersions)
        buffer.writeInt16BE(18, offset);
        offset += 2;
        
        // API version
        buffer.writeInt16BE(2, offset);
        offset += 2;
        
        // Correlation ID
        buffer.writeInt32BE(correlationId, offset);
        offset += 4;
        
        // Client ID
        buffer.writeInt16BE(clientId.length, offset);
        offset += 2;
        buffer.write(clientId, offset);
        offset += clientId.length;
        
        // Tagged fields (empty for version 2)
        buffer.writeInt8(0, offset);
        offset += 1;
        
        // Write the actual length
        buffer.writeInt32BE(offset - 4, 0);
        
        return buffer.slice(0, offset);
    }
    
    static createMetadataRequest() {
        // Simple Metadata request (API key 3, version 6)
        const correlationId = 2;
        const clientId = 'inspector';
        
        const buffer = Buffer.alloc(1024);
        let offset = 0;
        
        // Request length (will be filled later)
        offset += 4;
        
        // API key (3 for Metadata)
        buffer.writeInt16BE(3, offset);
        offset += 2;
        
        // API version
        buffer.writeInt16BE(6, offset);
        offset += 2;
        
        // Correlation ID
        buffer.writeInt32BE(correlationId, offset);
        offset += 4;
        
        // Client ID
        buffer.writeInt16BE(clientId.length, offset);
        offset += 2;
        buffer.write(clientId, offset);
        offset += clientId.length;
        
        // Tagged fields (empty)
        buffer.writeInt8(0, offset);
        offset += 1;
        
        // Topics array (empty - request all topics)
        buffer.writeInt8(1, offset); // compact array with 0 elements + 1
        offset += 1;
        
        // Allow auto topic creation
        buffer.writeInt8(1, offset);
        offset += 1;
        
        // Include cluster authorized operations
        buffer.writeInt8(0, offset);
        offset += 1;
        
        // Include topic authorized operations  
        buffer.writeInt8(0, offset);
        offset += 1;
        
        // Tagged fields (empty)
        buffer.writeInt8(0, offset);
        offset += 1;
        
        // Write the actual length
        buffer.writeInt32BE(offset - 4, 0);
        
        return buffer.slice(0, offset);
    }
    
    static parseMetadataResponse(buffer) {
        let offset = 4; // Skip length
        
        // Skip correlation ID
        offset += 4;
        
        // Skip tagged fields
        const taggedFieldsCount = buffer.readInt8(offset);
        offset += 1;
        
        // Skip throttle time
        offset += 4;
        
        // Brokers array
        const brokersCount = buffer.readInt8(offset) - 1; // Compact array
        offset += 1;
        
        console.log(`📊 Found ${brokersCount} brokers in metadata response:`);
        
        const brokers = [];
        for (let i = 0; i < brokersCount; i++) {
            const nodeId = buffer.readInt32BE(offset);
            offset += 4;
            
            const hostLength = buffer.readInt8(offset) - 1; // Compact string
            offset += 1;
            const host = buffer.toString('utf8', offset, offset + hostLength);
            offset += hostLength;
            
            const port = buffer.readInt32BE(offset);
            offset += 4;
            
            // Skip rack (compact string)
            const rackLength = buffer.readInt8(offset);
            offset += 1;
            if (rackLength > 0) {
                offset += rackLength - 1;
            }
            
            // Skip tagged fields
            const brokerTaggedFields = buffer.readInt8(offset);
            offset += 1;
            
            const broker = { nodeId, host, port };
            brokers.push(broker);
            console.log(`  🖥️  Broker ${nodeId}: ${host}:${port}`);
        }
        
        return brokers;
    }
}

async function main() {
    console.log('🔍 Kafka Metadata Inspector');
    console.log('============================');
    console.log('📡 Connecting to 157.230.178.87:9092...');
    
    try {
        const brokers = await KafkaMetadataInspector.inspectBrokerMetadata('157.230.178.87', 9092);
        
        console.log('\n📋 Summary:');
        console.log(`📊 Total brokers discovered: ${brokers.length}`);
        
        brokers.forEach((broker, index) => {
            const isReachable = broker.host === '157.230.178.87' || 
                               !broker.host.includes('localhost') && 
                               !broker.host.includes('127.0.0.1');
            
            console.log(`${index + 1}. Broker ${broker.nodeId}: ${broker.host}:${broker.port} ${isReachable ? '✅' : '❌'}`);
        });
        
        const problematicBrokers = brokers.filter(b => 
            b.host.includes('localhost') || 
            b.host.includes('127.0.0.1') || 
            b.host === '0.0.0.0'
        );
        
        if (problematicBrokers.length > 0) {
            console.log('\n⚠️  PROBLEM DETECTED:');
            console.log('The Kafka server is advertising unreachable broker addresses:');
            problematicBrokers.forEach(broker => {
                console.log(`  ❌ ${broker.host}:${broker.port}`);
            });
            console.log('\n💡 Solution: Update KAFKA_ADVERTISED_LISTENERS to use the external IP address.');
        } else {
            console.log('\n✅ All brokers are advertising reachable addresses!');
        }
        
    } catch (error) {
        console.error('❌ Failed to inspect metadata:', error.message);
    }
}

main();
