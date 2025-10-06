#!/bin/bash

# Market Aggregation Service - Quick Start Script

echo "======================================================================"
echo "Market Aggregation Service - Quick Start"
echo "======================================================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

echo "✓ pip3 found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt --quiet

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "======================================================================"
echo "Choose a mode to run:"
echo "======================================================================"
echo ""
echo "1) Single Aggregation (one-time fetch and analysis)"
echo "2) Price Tracker (continuous updates every 5 seconds)"
echo "3) API Server (REST API at http://localhost:8000)"
echo "4) Test Individual Clients"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running single aggregation..."
        echo ""
        python3 main.py single
        ;;
    2)
        echo ""
        echo "🚀 Starting price tracker (Press Ctrl+C to stop)..."
        echo ""
        python3 main.py tracker
        ;;
    3)
        echo ""
        echo "🚀 Starting API server..."
        echo ""
        echo "📖 API Documentation: http://localhost:8000/docs"
        echo ""
        python3 main.py api
        ;;
    4)
        echo ""
        echo "Testing individual API clients..."
        echo ""
        echo "==============================="
        echo "Testing Polymarket Client"
        echo "==============================="
        python3 api_clients/polymarket_client.py
        echo ""
        echo "==============================="
        echo "Testing Kalshi Client"
        echo "==============================="
        python3 api_clients/kalshi_client.py
        echo ""
        echo "==============================="
        echo "Testing Limitless Client"
        echo "==============================="
        python3 api_clients/limitless_client.py
        ;;
    5)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

