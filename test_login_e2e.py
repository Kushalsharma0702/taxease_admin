#!/usr/bin/env python3
"""
End-to-End Test Script for Admin Dashboard Login
Tests the complete authentication flow
"""

import asyncio
import sys
import httpx
import json
from datetime import datetime

# Test configuration
API_BASE_URL = "http://localhost:8003/api/v1"
FRONTEND_URL = "http://localhost:8080"

# Test credentials
TEST_USERS = [
    {"email": "superadmin@taxease.ca", "password": "demo123", "role": "superadmin"},
    {"email": "admin@taxease.ca", "password": "demo123", "role": "admin"},
]

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ {text}{Colors.END}")

async def test_health_check():
    """Test if backend is running"""
    print_header("Testing Backend Health")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE_URL.replace('/api/v1', '')}/health", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"Backend is healthy")
                print_info(f"Status: {data.get('status', 'unknown')}")
                print_info(f"Redis: {data.get('redis', 'unknown')}")
                return True
            else:
                print_error(f"Health check failed: HTTP {response.status_code}")
                return False
                
    except httpx.ConnectError:
        print_error("Cannot connect to backend. Is it running on port 8003?")
        return False
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False

async def test_login(email, password, expected_role):
    """Test login for a specific user"""
    print(f"\n{Colors.BLUE}Testing login: {email}{Colors.END}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Login request
            response = await client.post(
                f"{API_BASE_URL}/auth/login",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
            
            if response.status_code != 200:
                print_error(f"Login failed: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print_error(f"Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print_error(f"Response: {response.text[:200]}")
                return False
            
            data = response.json()
            
            # Validate response structure
            if "user" not in data or "token" not in data:
                print_error("Invalid response structure")
                print_info(f"Response keys: {list(data.keys())}")
                return False
            
            user = data["user"]
            token = data["token"]
            
            # Validate user data
            if user.get("email") != email:
                print_error(f"Email mismatch: expected {email}, got {user.get('email')}")
                return False
            
            if user.get("role") != expected_role:
                print_error(f"Role mismatch: expected {expected_role}, got {user.get('role')}")
                return False
            
            # Validate token
            if not token.get("access_token"):
                print_error("No access token in response")
                return False
            
            print_success("Login successful")
            print_info(f"User ID: {user.get('id')}")
            print_info(f"Name: {user.get('name')}")
            print_info(f"Role: {user.get('role')}")
            print_info(f"Active: {user.get('is_active')}")
            print_info(f"Token expires in: {token.get('expires_in')} seconds")
            
            # Test /auth/me endpoint with token
            print(f"\n{Colors.BLUE}Testing /auth/me endpoint...{Colors.END}")
            me_response = await client.get(
                f"{API_BASE_URL}/auth/me",
                headers={"Authorization": f"Bearer {token['access_token']}"},
                timeout=10.0
            )
            
            if me_response.status_code == 200:
                me_data = me_response.json()
                print_success("Token authentication works")
                print_info(f"Verified user: {me_data.get('email')}")
            else:
                print_error(f"/auth/me failed: HTTP {me_response.status_code}")
                return False
            
            return True
            
    except httpx.ConnectError:
        print_error("Cannot connect to backend")
        return False
    except Exception as e:
        print_error(f"Login test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_cors():
    """Test CORS configuration"""
    print_header("Testing CORS Configuration")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.options(
                f"{API_BASE_URL}/auth/login",
                headers={
                    "Origin": "http://localhost:8080",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type",
                },
                timeout=5.0
            )
            
            # Check CORS headers
            allow_origin = response.headers.get("access-control-allow-origin")
            allow_methods = response.headers.get("access-control-allow-methods")
            allow_credentials = response.headers.get("access-control-allow-credentials")
            
            if allow_origin:
                print_success(f"CORS enabled for origin: {allow_origin}")
            else:
                print_error("CORS headers not found")
                return False
            
            if allow_credentials == "true":
                print_success("CORS credentials allowed")
            else:
                print_info("CORS credentials not allowed")
            
            if allow_methods and "POST" in allow_methods:
                print_success(f"POST method allowed")
            
            return True
            
    except Exception as e:
        print_error(f"CORS test error: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print_header("Admin Dashboard E2E Test Suite")
    print_info(f"API URL: {API_BASE_URL}")
    print_info(f"Frontend URL: {FRONTEND_URL}")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    # Test 1: Health check
    results["total"] += 1
    if await test_health_check():
        results["passed"] += 1
    else:
        results["failed"] += 1
        print_error("\nBackend is not running. Start it first:")
        print_info("cd /home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin")
        print_info("./start_admin_system.sh")
        return 1
    
    # Test 2: CORS
    results["total"] += 1
    if await test_cors():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test 3 & 4: Login for each user
    for user in TEST_USERS:
        results["total"] += 1
        if await test_login(user["email"], user["password"], user["role"]):
            results["passed"] += 1
        else:
            results["failed"] += 1
    
    # Summary
    print_header("Test Results Summary")
    print(f"Total Tests: {results['total']}")
    print_success(f"Passed: {results['passed']}")
    if results['failed'] > 0:
        print_error(f"Failed: {results['failed']}")
    else:
        print_success("All tests passed! ✓")
    
    print(f"\n{Colors.BLUE}Next Steps:{Colors.END}")
    print("1. Open browser: http://localhost:8080")
    print("2. Login with: superadmin@taxease.ca / demo123")
    print("3. Verify dashboard loads correctly")
    
    return 0 if results["failed"] == 0 else 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

