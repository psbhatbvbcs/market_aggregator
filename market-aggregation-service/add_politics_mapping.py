"""
Helper script to easily add politics market mappings

Usage:
    python add_politics_mapping.py

This will guide you through adding a new manual mapping for politics markets.
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient


def search_markets():
    """Search and display markets to help find IDs"""
    
    print("\n" + "=" * 70)
    print("SEARCH MARKETS TO FIND IDs")
    print("=" * 70 + "\n")
    
    search_term = input("Enter search term (e.g., 'Trump', 'election', '2024'): ").strip()
    
    if not search_term:
        print("No search term provided, skipping search.")
        return
    
    print(f"\n🔍 Searching for '{search_term}'...\n")
    
    # Search Polymarket
    print("=" * 70)
    print("POLYMARKET RESULTS")
    print("=" * 70)
    try:
        poly_client = PolymarketClient()
        poly_markets = poly_client.fetch_markets(limit=100, closed=False, active=True)
        
        # Filter by search term
        matching = [m for m in poly_markets if search_term.lower() in m.question.lower()]
        
        if matching:
            for i, market in enumerate(matching[:10], 1):
                print(f"\n{i}. {market.question}")
                print(f"   ID: {market.market_id}")
                print(f"   Type: {market.market_type.value}")
                if market.outcomes:
                    outcomes = ", ".join([o.name for o in market.outcomes[:3]])
                    print(f"   Outcomes: {outcomes}")
        else:
            print("No matches found.")
    except Exception as e:
        print(f"Error: {e}")
    
    # Search Kalshi
    print("\n" + "=" * 70)
    print("KALSHI RESULTS")
    print("=" * 70)
    try:
        kalshi_client = KalshiClient()
        kalshi_markets = kalshi_client.fetch_markets(limit=100, status='open')
        
        # Filter by search term
        matching = [m for m in kalshi_markets if search_term.lower() in m.question.lower()]
        
        if matching:
            for i, market in enumerate(matching[:10], 1):
                print(f"\n{i}. {market.question}")
                print(f"   Ticker: {market.market_id}")
                print(f"   Type: {market.market_type.value}")
                if market.outcomes:
                    outcomes = ", ".join([o.name for o in market.outcomes[:3]])
                    print(f"   Outcomes: {outcomes}")
        else:
            print("No matches found.")
    except Exception as e:
        print(f"Error (may need KALSHI_API_KEY): {e}")
    
    print("\n" + "=" * 70 + "\n")


def generate_mapping_code():
    """Generate the code snippet to add to market_mappings.py"""
    
    print("\n" + "=" * 70)
    print("CREATE NEW MARKET MAPPING")
    print("=" * 70 + "\n")
    
    print("Enter the market IDs you found (leave blank to skip a platform):\n")
    
    # Get IDs
    polymarket_id = input("Polymarket condition ID (0x...): ").strip()
    kalshi_id = input("Kalshi ticker (e.g., KXPRES-2024-...): ").strip()
    description = input("Description (e.g., '2024 Presidential Winner'): ").strip()
    
    if not polymarket_id and not kalshi_id:
        print("\n❌ No IDs provided!")
        return
    
    # Generate code
    print("\n" + "=" * 70)
    print("GENERATED CODE - Add this to market_mappings.py")
    print("=" * 70 + "\n")
    
    print("In market_mappings.py, add this to the 'politics' array:\n")
    print("```python")
    print("    {")
    if polymarket_id:
        print(f'        "polymarket_id": "{polymarket_id}",')
    if kalshi_id:
        print(f'        "kalshi_id": "{kalshi_id}",')
    if description:
        print(f'        "description": "{description}"')
    print("    },")
    print("```\n")
    
    # Show where to add it
    print("Step-by-step:")
    print("1. Open market_mappings.py")
    print("2. Find the 'politics' section (around line 10)")
    print("3. Add the code above inside the 'politics' array")
    print("4. Save the file")
    print("5. Run: python politics_comparison.py")
    print("\n" + "=" * 70 + "\n")


def main():
    """Main menu"""
    
    print("\n" + "=" * 70)
    print("POLITICS MARKET MAPPING HELPER")
    print("=" * 70 + "\n")
    
    print("This tool helps you create manual market mappings for politics markets.\n")
    
    print("What would you like to do?")
    print("  1. Search markets to find IDs")
    print("  2. Generate mapping code")
    print("  3. Both (search first, then generate)")
    print("  4. Quit")
    
    choice = input("\nChoice (1-4): ").strip()
    
    if choice == "1":
        search_markets()
    elif choice == "2":
        generate_mapping_code()
    elif choice == "3":
        search_markets()
        print("\n" + "=" * 70)
        input("\nPress Enter to continue to code generation...")
        generate_mapping_code()
    elif choice == "4":
        print("\nGoodbye!")
        return
    else:
        print("\n❌ Invalid choice")
        return
    
    print("\n✅ Done!")
    print("\nNext steps:")
    print("  • Add the generated code to market_mappings.py")
    print("  • Run: python politics_comparison.py")
    print("\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
