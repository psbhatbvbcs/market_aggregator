#!/bin/bash

# Market Aggregator Dashboard Startup Script
# Starts both the FastAPI backend and Next.js frontend

echo "=================================="
echo "Market Aggregator Dashboard"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "market-aggregation-service" ] || [ ! -d "aggregator-dashboard-web" ]; then
    echo "❌ Error: Please run this script from the market_aggregator root directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start FastAPI backend
echo "🚀 Starting FastAPI backend..."
cd market-aggregation-service
python api_server.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Start Next.js frontend
echo "🎨 Starting Next.js frontend..."
cd aggregator-dashboard-web
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=================================="
echo "✅ Dashboard is starting up!"
echo "=================================="
echo ""
echo "Backend API:  http://localhost:8000"
echo "Frontend:     http://localhost:3000"
echo "API Docs:     http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait

