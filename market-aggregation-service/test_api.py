#!/usr/bin/env python3
"""
Quick API Test Script
Tests the FastAPI endpoints to verify they're working
"""

import requests
import json
from datetime import datetime

API_BASE_URL = "http://localhost:8000"

def test_endpoint(name, url):
    """Test a single endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print('='*60)
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS (Status: {response.status_code})")
            print(f"\nResponse preview:")
            print(json.dumps(data, indent=2)[:500] + "...")
            
            # Show summary if available
            if 'summary' in data:
                print(f"\nSummary:")
                for key, value in data['summary'].items():
                    print(f"  {key}: {value}")
        else:
            print(f"❌ FAILED (Status: {response.status_code})")
            print(f"Response: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print("❌ FAILED: Could not connect to API")
        print("   Make sure the FastAPI server is running: python api_server.py")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    """Run all tests"""
    print("\n" + "🧪" * 30)
    print("API ENDPOINT TESTS")
    print("🧪" * 30)
    print(f"\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test endpoints
    test_endpoint("Root", f"{API_BASE_URL}/")
    test_endpoint("NFL Crypto Markets", f"{API_BASE_URL}/nfl/crypto")
    test_endpoint("NFL Traditional Odds", f"{API_BASE_URL}/nfl/traditional")
    test_endpoint("Politics Markets", f"{API_BASE_URL}/politics")
    
    print("\n" + "="*60)
    print("✅ All tests complete")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

