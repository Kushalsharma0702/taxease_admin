#!/bin/bash
# Final Admin Dashboard Startup Script

set -e

echo "🚀 Starting Tax Hub Admin Dashboard"
echo "===================================="

# Navigate to project root
cd /home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Start Backend
echo -e "\n${BLUE}[1/3] Starting Backend (Port 8003)${NC}"
cd backend

# Kill any existing backend
lsof -ti:8003 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend
source venv/bin/activate
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload > backend.log 2>&1 &
echo $! > backend.pid

# Wait for backend
echo "Waiting for backend..."
for i in {1..20}; do
    if curl -s http://localhost:8003/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        tail -20 backend.log
        exit 1
    fi
    sleep 1
done

# 2. Start Frontend
echo -e "\n${BLUE}[2/3] Starting Frontend (Port 8080)${NC}"
cd ..

# Kill any existing frontend
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1

# Start frontend
nohup npm run dev > frontend.log 2>&1 &

# Wait for frontend
echo "Waiting for frontend..."
for i in {1..20}; do
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend ready${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}✗ Frontend failed to start${NC}"
        tail -20 frontend.log
        exit 1
    fi
    sleep 1
done

# 3. Verify Login
echo -e "\n${BLUE}[3/3] Verifying Login${NC}"
LOGIN_TEST=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@taxease.ca","password":"demo123"}' | grep -o '"access_token"' || echo "")

if [ -n "$LOGIN_TEST" ]; then
    echo -e "${GREEN}✓ Login API working${NC}"
else
    echo -e "${RED}✗ Login API failed${NC}"
fi

# Success!
echo ""
echo -e "${GREEN}======================================"
echo "✅ Admin Dashboard Started Successfully!"
echo "======================================${NC}"
echo ""
echo "🌐 URLs:"
echo "   Frontend:  http://localhost:8080"
echo "   Backend:   http://localhost:8003"
echo "   API Docs:  http://localhost:8003/docs"
echo "   Test Page: http://localhost:8080/test-login.html"
echo ""
echo "🔑 Login Credentials:"
echo "   Admin:      admin@taxease.ca / demo123"
echo "   Superadmin: superadmin@taxease.ca / demo123"
echo ""
echo "📋 Logs:"
echo "   Backend:  backend/backend.log"
echo "   Frontend: frontend.log"
echo ""
echo "🛑 To stop:"
echo "   kill \$(cat backend/backend.pid)"
echo "   killall node"
echo ""

# Keep script running
echo "Press Ctrl+C to stop all services..."
tail -f backend/backend.log
