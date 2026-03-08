#!/usr/bin/env python3
"""
Comprehensive login test to identify issues
"""
import asyncio
import httpx
import json

async def test_complete_flow():
    print("🔍 Testing Complete Login Flow")
    print("="*60)
    
    # Test 1: Backend direct
    print("\n1️⃣ Testing Backend Direct (port 8003)")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8003/api/v1/auth/login",
                json={"email": "admin@taxease.ca", "password": "demo123"},
                timeout=10.0
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ SUCCESS - User: {data['user']['email']}")
                print(f"   Token length: {len(data['token']['access_token'])}")
            else:
                print(f"   ❌ FAILED - {response.text}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 2: Through Vite proxy
    print("\n2️⃣ Testing Through Vite Proxy (port 8080)")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8080/api/v1/auth/login",
                json={"email": "admin@taxease.ca", "password": "demo123"},
                headers={"Origin": "http://localhost:8080"},
                timeout=10.0
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ SUCCESS - User: {data['user']['email']}")
                print(f"   Token: {data['token']['access_token'][:50]}...")
            else:
                print(f"   ❌ FAILED")
                print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 3: CORS preflight
    print("\n3️⃣ Testing CORS Preflight")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.options(
                "http://localhost:8003/api/v1/auth/login",
                headers={
                    "Origin": "http://localhost:8080",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type",
                },
                timeout=5.0
            )
            print(f"   Status: {response.status_code}")
            cors_headers = {
                "allow-origin": response.headers.get("access-control-allow-origin"),
                "allow-methods": response.headers.get("access-control-allow-methods"),
                "allow-credentials": response.headers.get("access-control-allow-credentials"),
            }
            print(f"   CORS Headers: {json.dumps(cors_headers, indent=6)}")
            if cors_headers["allow-origin"]:
                print(f"   ✅ CORS configured")
            else:
                print(f"   ❌ CORS missing")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 4: Frontend page
    print("\n4️⃣ Testing Frontend Page Load")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8080", timeout=5.0)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200 and "TaxEase" in response.text:
                print(f"   ✅ Frontend loads correctly")
            else:
                print(f"   ❌ Frontend issue")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n" + "="*60)
    print("✅ Test Complete")
    print("\nIf all tests pass, try these credentials:")
    print("   Email: admin@taxease.ca")
    print("   Password: demo123")
    print("\nOr:")
    print("   Email: superadmin@taxease.ca")
    print("   Password: demo123")

if __name__ == "__main__":
    asyncio.run(test_complete_flow())
