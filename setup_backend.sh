#!/bin/bash

# Quick Setup Script for Admin Dashboard Backend
# Run this first before starting services

set -e

echo "======================================"
echo "Admin Dashboard Backend Setup"
echo "======================================"
echo ""

BACKEND_DIR="/home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin/backend"
cd "$BACKEND_DIR"

# Step 1: Virtual Environment
if [ -d "venv" ]; then
    echo "✓ Virtual environment found"
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate venv
source venv/bin/activate

# Step 2: Install dependencies
echo ""
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✓ Dependencies installed"

# Step 3: Create admin users
echo ""
echo "Creating admin users..."
python3 create_default_admin.py
echo ""

# Step 4: Kill any existing process on port 8003
echo "Cleaning up port 8003..."
lsof -ti:8003 | xargs kill -9 2>/dev/null || true
echo "✓ Port 8003 is clear"

# Step 5: Start backend
echo ""
echo "Starting backend on port 8003..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo ""
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8003/health > /dev/null 2>&1; then
        echo "✓ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Backend failed to start. Check backend.log for errors:"
        tail -20 backend.log
        exit 1
    fi
    sleep 1
    echo -n "."
done

# Success message
echo ""
echo "======================================"
echo "✓ Backend Setup Complete!"
echo "======================================"
echo ""
echo "Backend API: http://localhost:8003"
echo "API Docs:    http://localhost:8003/docs"
echo "Health:      http://localhost:8003/health"
echo ""
echo "Logs: $BACKEND_DIR/backend.log"
echo ""
echo "Demo Credentials:"
echo "  Superadmin: superadmin@taxease.ca / demo123"
echo "  Admin:      admin@taxease.ca / demo123"
echo ""
echo "To stop backend: kill \$(cat $BACKEND_DIR/backend.pid)"
echo ""
echo "Next: Run the E2E test"
echo "  python3 test_login_e2e.py"
echo ""

