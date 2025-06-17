const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'kafka-admin-test',
  brokers: ['localhost:9092']
});

async function listTopics() {
  const admin = kafka.admin();
  await admin.connect();
  
  console.log('📋 Listing all topics:');
  const topics = await admin.listTopics();
  
  if (topics.length === 0) {
    console.log('   No topics found');
  } else {
    topics.forEach((topic, index) => {
      console.log(`   ${index + 1}. ${topic}`);
    });
  }
  
  await admin.disconnect();
}

async function createTopic(topicName, partitions = 3, replicationFactor = 1) {
  const admin = kafka.admin();
  await admin.connect();
  
  try {
    await admin.createTopics({
      topics: [{
        topic: topicName,
        numPartitions: partitions,
        replicationFactor: replicationFactor
      }]
    });
    
    console.log(`✅ Topic '${topicName}' created successfully`);
  } catch (error) {
    if (error.message.includes('TopicExistsException')) {
      console.log(`ℹ️  Topic '${topicName}' already exists`);
    } else {
      console.error(`❌ Error creating topic: ${error.message}`);
    }
  }
  
  await admin.disconnect();
}

async function deleteTopic(topicName) {
  const admin = kafka.admin();
  await admin.connect();
  
  try {
    await admin.deleteTopics({
      topics: [topicName]
    });
    
    console.log(`✅ Topic '${topicName}' deleted successfully`);
  } catch (error) {
    if (error.message.includes('UnknownTopicOrPartitionError')) {
      console.log(`ℹ️  Topic '${topicName}' does not exist`);
    } else {
      console.error(`❌ Error deleting topic: ${error.message}`);
    }
  }
  
  await admin.disconnect();
}

async function describeTopics(topicNames) {
  const admin = kafka.admin();
  await admin.connect();
  
  try {
    const metadata = await admin.fetchTopicMetadata({ topics: topicNames });
    
    console.log('📊 Topic Details:');
    metadata.topics.forEach(topic => {
      console.log(`\n   Topic: ${topic.name}`);
      console.log(`   Partitions: ${topic.partitions.length}`);
      
      topic.partitions.forEach(partition => {
        console.log(`     Partition ${partition.partitionId}: Leader=${partition.leader}, Replicas=[${partition.replicas.join(', ')}]`);
      });
    });
  } catch (error) {
    console.error(`❌ Error describing topics: ${error.message}`);
  }
  
  await admin.disconnect();
}

async function listConsumerGroups() {
  const admin = kafka.admin();
  await admin.connect();
  
  try {
    const groups = await admin.listGroups();
    
    console.log('👥 Consumer Groups:');
    if (groups.groups.length === 0) {
      console.log('   No consumer groups found');
    } else {
      groups.groups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.groupId} (Protocol: ${group.protocolType})`);
      });
    }
  } catch (error) {
    console.error(`❌ Error listing consumer groups: ${error.message}`);
  }
  
  await admin.disconnect();
}

// Command line interface
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  const arg3 = process.argv[5];
  
  console.log('🔧 Kafka Admin Tool\n');
  
  try {
    switch (command) {
      case 'list-topics':
        await listTopics();
        break;
        
      case 'create-topic':
        if (!arg1) {
          console.log('❌ Please provide a topic name');
          console.log('Usage: node admin.js create-topic <topic-name> [partitions] [replication-factor]');
          process.exit(1);
        }
        const partitions = arg2 ? parseInt(arg2) : 3;
        const replicationFactor = arg3 ? parseInt(arg3) : 1;
        await createTopic(arg1, partitions, replicationFactor);
        break;
        
      case 'delete-topic':
        if (!arg1) {
          console.log('❌ Please provide a topic name');
          console.log('Usage: node admin.js delete-topic <topic-name>');
          process.exit(1);
        }
        await deleteTopic(arg1);
        break;
        
      case 'describe-topics':
        if (!arg1) {
          console.log('❌ Please provide topic name(s)');
          console.log('Usage: node admin.js describe-topics <topic1> [topic2] [topic3]...');
          process.exit(1);
        }
        const topics = process.argv.slice(3);
        await describeTopics(topics);
        break;
        
      case 'list-groups':
        await listConsumerGroups();
        break;
        
      default:
        console.log('Usage: node admin.js <command> [arguments]');
        console.log('\nCommands:');
        console.log('  list-topics                           List all topics');
        console.log('  create-topic <name> [partitions] [rf] Create a topic');
        console.log('  delete-topic <name>                   Delete a topic');
        console.log('  describe-topics <topic1> [topic2]... Describe topics');
        console.log('  list-groups                           List consumer groups');
        console.log('\nExamples:');
        console.log('  node admin.js list-topics');
        console.log('  node admin.js create-topic my-topic 3 1');
        console.log('  node admin.js describe-topics my-topic');
        break;
    }
  } catch (error) {
    console.error(`❌ Admin command error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
