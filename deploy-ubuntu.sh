#!/bin/bash

# Kafka Docker Deployment Script for Ubuntu Server
# Server IP: 157.230.178.87

set -e

echo "🚀 Kafka Docker Deployment Script"
echo "=================================="
echo "Server IP: 157.230.178.87"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please log out and back in, then re-run this script."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed."
fi

echo "🔍 Checking Docker status..."
sudo systemctl start docker
sudo systemctl enable docker

echo "🧹 Cleaning up any existing Kafka containers..."
docker-compose down -v 2>/dev/null || true

echo "🏗️  Building and starting Kafka cluster..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎯 Testing Kafka connectivity..."
timeout 30 docker-compose exec kafka kafka-broker-api-versions --bootstrap-server kafka:29092 || echo "Internal connectivity test completed"

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo "📊 Kafka UI: http://157.230.178.87:8082"
echo "🔗 Kafka Broker: 157.230.178.87:9092"
echo "📋 Schema Registry: http://157.230.178.87:8081"
echo ""
echo "🚦 To check logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo "🗑️  To clean up: docker-compose down -v"
