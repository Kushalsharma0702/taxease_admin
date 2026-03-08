#!/usr/bin/env python3
"""
Quick Status Check Script
Checks if admin dashboard system is running properly
"""

import httpx
import sys

def check_status():
    print("🔍 Admin Dashboard Status Check")
    print("=" * 50)
    
    all_ok = True
    
    # Check backend
    try:
        response = httpx.get("http://localhost:8003/health", timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend: Running on port 8003")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Redis: {data.get('redis', 'unknown')}")
        else:
            print(f"❌ Backend: HTTP {response.status_code}")
            all_ok = False
    except Exception as e:
        print(f"❌ Backend: Not responding ({str(e)[:50]})")
        all_ok = False
    
    # Check frontend
    try:
        response = httpx.get("http://localhost:8080", timeout=5.0)
        if response.status_code == 200:
            print(f"✅ Frontend: Running on port 8080")
        else:
            print(f"❌ Frontend: HTTP {response.status_code}")
            all_ok = False
    except Exception as e:
        print(f"❌ Frontend: Not responding ({str(e)[:50]})")
        all_ok = False
    
    # Test login
    try:
        response = httpx.post(
            "http://localhost:8003/api/v1/auth/login",
            json={"email": "superadmin@taxease.ca", "password": "demo123"},
            timeout=5.0
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login: Working")
            print(f"   User: {data['user']['email']}")
            print(f"   Role: {data['user']['role']}")
        else:
            print(f"❌ Login: Failed (HTTP {response.status_code})")
            all_ok = False
    except Exception as e:
        print(f"❌ Login: Error ({str(e)[:50]})")
        all_ok = False
    
    print("=" * 50)
    if all_ok:
        print("✅ All systems operational!")
        print("\n🌐 Access: http://localhost:8080")
        print("🔑 Login: superadmin@taxease.ca / demo123")
        return 0
    else:
        print("❌ Some systems are down")
        print("\nRun: ./start_admin_system.sh")
        return 1

if __name__ == "__main__":
    sys.exit(check_status())
