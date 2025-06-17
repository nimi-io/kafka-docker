#!/bin/bash

# Kafka Docker Management Script

set -e

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="kafka-docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to start Kafka
start_kafka() {
    print_status "Starting Kafka stack..."
    docker-compose -p $PROJECT_NAME up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if Kafka is ready
    print_status "Checking Kafka health..."
    for i in {1..30}; do
        if docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
            print_status "Kafka is ready!"
            break
        else
            if [ $i -eq 30 ]; then
                print_error "Kafka failed to start properly"
                exit 1
            fi
            echo "Waiting for Kafka... ($i/30)"
            sleep 2
        fi
    done
    
    print_status "All services are running!"
    print_status "Kafka UI: http://localhost:8080"
    print_status "Kafka Bootstrap Server: localhost:9092"
}

# Function to stop Kafka
stop_kafka() {
    print_status "Stopping Kafka stack..."
    docker-compose -p $PROJECT_NAME down
}

# Function to restart Kafka
restart_kafka() {
    print_status "Restarting Kafka stack..."
    stop_kafka
    start_kafka
}

# Function to show status
show_status() {
    print_status "Kafka stack status:"
    docker-compose -p $PROJECT_NAME ps
}

# Function to show logs
show_logs() {
    if [ -z "$1" ]; then
        docker-compose -p $PROJECT_NAME logs -f
    else
        docker-compose -p $PROJECT_NAME logs -f "$1"
    fi
}

# Function to create a topic
create_topic() {
    if [ -z "$1" ]; then
        print_error "Please provide a topic name"
        print_status "Usage: $0 create-topic <topic-name> [partitions] [replication-factor]"
        exit 1
    fi
    
    TOPIC_NAME="$1"
    PARTITIONS="${2:-3}"
    REPLICATION_FACTOR="${3:-1}"
    
    print_status "Creating topic: $TOPIC_NAME with $PARTITIONS partitions and replication factor $REPLICATION_FACTOR"
    docker exec kafka kafka-topics --create \
        --topic "$TOPIC_NAME" \
        --bootstrap-server localhost:9092 \
        --partitions "$PARTITIONS" \
        --replication-factor "$REPLICATION_FACTOR"
}

# Function to list topics
list_topics() {
    print_status "Listing all topics:"
    docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
}

# Function to delete a topic
delete_topic() {
    if [ -z "$1" ]; then
        print_error "Please provide a topic name"
        print_status "Usage: $0 delete-topic <topic-name>"
        exit 1
    fi
    
    TOPIC_NAME="$1"
    print_warning "Deleting topic: $TOPIC_NAME"
    docker exec kafka kafka-topics --delete --topic "$TOPIC_NAME" --bootstrap-server localhost:9092
}

# Function to clean up everything
cleanup() {
    print_warning "This will remove all containers and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Kafka stack..."
        docker-compose -p $PROJECT_NAME down -v
        print_status "Cleanup complete!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show help
show_help() {
    echo "Kafka Docker Management Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start              Start the Kafka stack"
    echo "  stop               Stop the Kafka stack"
    echo "  restart            Restart the Kafka stack"
    echo "  status             Show status of all services"
    echo "  logs [service]     Show logs (optionally for specific service)"
    echo "  create-topic <name> [partitions] [replication-factor]"
    echo "                     Create a new topic"
    echo "  list-topics        List all topics"
    echo "  delete-topic <name> Delete a topic"
    echo "  cleanup            Remove all containers and volumes"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 create-topic my-topic 3 1"
    echo "  $0 logs kafka"
    echo "  $0 cleanup"
}

# Main script logic
check_docker

case "$1" in
    start)
        start_kafka
        ;;
    stop)
        stop_kafka
        ;;
    restart)
        restart_kafka
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    create-topic)
        create_topic "$2" "$3" "$4"
        ;;
    list-topics)
        list_topics
        ;;
    delete-topic)
        delete_topic "$2"
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
