#!/bin/bash

# Market Aggregator Dashboard Setup Script
# Installs all dependencies for both backend and frontend

echo "=================================="
echo "Market Aggregator Dashboard Setup"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "market-aggregation-service" ] || [ ! -d "aggregator-dashboard-web" ]; then
    echo "❌ Error: Please run this script from the market_aggregator root directory"
    exit 1
fi

# Backend setup
echo "📦 Setting up backend (Python)..."
cd market-aggregation-service

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8 or higher"
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD=$(command -v python3 || command -v python)

# Install Python dependencies
echo "Installing Python packages..."
$PYTHON_CMD -m pip install -r requirements.txt

echo "✅ Backend setup complete"
echo ""

# Frontend setup
cd ../aggregator-dashboard-web
echo "📦 Setting up frontend (Node.js)..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm"
    exit 1
fi

# Install Node dependencies
echo "Installing Node packages..."
npm install

echo "✅ Frontend setup complete"
echo ""

# Go back to root
cd ..

echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. (Optional) Configure API keys in market-aggregation-service/config"
echo "2. Run the dashboard:"
echo "   ./start_dashboard.sh"
echo ""
echo "Or run manually:"
echo "  Terminal 1: cd market-aggregation-service && python api_server.py"
echo "  Terminal 2: cd aggregator-dashboard-web && npm run dev"
echo ""

