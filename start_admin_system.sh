#!/bin/bash

# Start Admin Dashboard System
# This script starts both the backend API and frontend dev server

set -e

echo "======================================"
echo "Starting Tax Hub Admin Dashboard"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKEND_DIR="/home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin/backend"
FRONTEND_DIR="/home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down services...${NC}"
    if [ -f "$BACKEND_DIR/backend.pid" ]; then
        PID=$(cat "$BACKEND_DIR/backend.pid")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            echo -e "${GREEN}✓ Backend stopped${NC}"
        fi
        rm -f "$BACKEND_DIR/backend.pid"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Step 1: Setup Backend
echo -e "${BLUE}[1/5] Setting up backend...${NC}"
cd "$BACKEND_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install -q -r requirements.txt

# Step 2: Create admin users
echo -e "\n${BLUE}[2/5] Creating admin users...${NC}"
python3 create_default_admin.py

# Step 3: Start Backend
echo -e "\n${BLUE}[3/5] Starting backend API on port 8003...${NC}"
# Kill existing process on port 8003
lsof -ti:8003 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend in background using venv python
nohup venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8003/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready!${NC}"
        echo "  Status: $(curl -s http://localhost:8003/health | python3 -c 'import sys, json; print(json.load(sys.stdin)["status"])')"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo "Last 20 lines of backend.log:"
        tail -20 backend.log
        exit 1
    fi
    sleep 1
done

# Step 4: Setup Frontend
echo -e "\n${BLUE}[4/5] Setting up frontend...${NC}"
cd "$FRONTEND_DIR"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Step 5: Display Info
echo -e "\n${GREEN}======================================"
echo "✓ Admin Dashboard Started Successfully!"
echo "======================================${NC}"
echo ""
echo "Backend API: http://localhost:8003"
echo "API Docs:    http://localhost:8003/docs"
echo "Health:      http://localhost:8003/health"
echo ""
echo "Frontend:    http://localhost:8080"
echo ""
echo -e "${BLUE}Demo Credentials:${NC}"
echo "  Superadmin: superadmin@taxease.ca / demo123"
echo "  Admin:      admin@taxease.ca / demo123"
echo ""
echo "Backend logs: $BACKEND_DIR/backend.log"
echo ""
echo -e "${BLUE}Starting frontend dev server...${NC}"
echo "Press Ctrl+C to stop all services"
echo ""

# Start frontend (this runs in foreground)
npm run dev

