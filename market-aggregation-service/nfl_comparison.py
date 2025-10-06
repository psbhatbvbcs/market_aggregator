"""
NFL Market Comparison - Focused on NFL markets across Polymarket and Kalshi

Usage:
    python nfl_comparison.py
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from aggregator import MarketAggregator
from models import MarketType
import json
from datetime import datetime


def fetch_nfl_markets():
    """Fetch NFL markets from Polymarket and Kalshi"""
    
    print("\n" + "=" * 70)
    print("NFL MARKET COMPARISON - POLYMARKET vs KALSHI")
    print("=" * 70 + "\n")
    
    # Initialize clients
    polymarket = PolymarketClient()
    kalshi = KalshiClient()
    
    all_markets = []
    
    # ========================================================================
    # Fetch from Polymarket (tag_id = 450 for NFL)
    # ========================================================================
    print("[1/2] Fetching NFL markets from Polymarket...")
    print("-" * 70)
    
    try:
        polymarket_nfl = polymarket.fetch_markets(
            limit=200,
            closed=False,
            active=True,
            tag_id=450  # NFL tag
        )
        all_markets.extend(polymarket_nfl)
        print(f"✅ Polymarket: Fetched {len(polymarket_nfl)} NFL markets")
        
        # Show some examples
        if polymarket_nfl:
            print("\nExample Polymarket NFL markets:")
            for market in polymarket_nfl[:3]:
                print(f"  • {market.question}")
    except Exception as e:
        print(f"❌ Error fetching from Polymarket: {e}")
    
    print()
    
    # ========================================================================
    # Fetch from Kalshi (series_ticker = KXNFLGAME)
    # ========================================================================
    print("[2/2] Fetching NFL markets from Kalshi...")
    print("-" * 70)
    
    try:
        kalshi_nfl = kalshi.fetch_markets(
            series_ticker="KXNFLGAME",  # NFL games series
            status="open",
            limit=200
        )
        all_markets.extend(kalshi_nfl)
        print(f"✅ Kalshi: Fetched {len(kalshi_nfl)} NFL markets")
        
        # Show some examples
        if kalshi_nfl:
            print("\nExample Kalshi NFL markets:")
            for market in kalshi_nfl[:3]:
                print(f"  • {market.question}")
                print(f"    Ticker: {market.market_id}")
    except Exception as e:
        print(f"❌ Error fetching from Kalshi: {e}")
        print("    (Kalshi may require API authentication)")
    
    print("\n" + "=" * 70)
    print(f"TOTAL NFL MARKETS FETCHED: {len(all_markets)}")
    print("=" * 70)
    
    return all_markets


def compare_nfl_markets(markets):
    """Compare NFL markets across platforms"""
    
    if not markets:
        print("\n⚠️  No markets to compare!")
        return
    
    print("\n" + "=" * 70)
    print("MATCHING NFL MARKETS ACROSS PLATFORMS")
    print("=" * 70 + "\n")
    
    # Use aggregator for matching
    aggregator = MarketAggregator()
    aggregator.all_markets = markets
    
    # Match markets
    matched_groups = aggregator.match_markets()
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    if not comparisons:
        print("\n⚠️  No matched markets found between platforms")
        print("    This could mean:")
        print("    - Different game coverage between platforms")
        print("    - Markets are worded too differently")
        print("    - Time windows don't align")
        return comparisons
    
    print("\n" + "=" * 70)
    print(f"FOUND {len(comparisons)} NFL MARKET COMPARISONS")
    print("=" * 70 + "\n")
    
    # Show detailed comparisons
    for i, comp in enumerate(comparisons, 1):
        print(f"{i}. {comp.question}")
        print(f"   {'─' * 66}")
        
        # Show each platform's odds
        for market in comp.markets:
            platform_name = market.platform.value.upper()
            print(f"\n   {platform_name}:")
            print(f"   Market ID: {market.market_id}")
            
            if market.outcomes:
                for outcome in market.outcomes:
                    marker = "⭐" if (market.platform == comp.best_platform and 
                                    outcome.name == comp.best_outcome_name) else "  "
                    print(f"   {marker} {outcome.name}: {outcome.american_odds} ({outcome.price:.1%})")
        
        print(f"\n   🎯 BEST ODDS: {comp.best_platform.value.upper()} @ {comp.best_odds}")
        print(f"   📊 PRICE SPREAD: {comp.price_spread:.2f}%")
        
        if comp.arbitrage_opportunity:
            print(f"   💰 ARBITRAGE: {comp.arbitrage_percentage:.2f}% profit opportunity!")
        
        print()
    
    return comparisons


def export_results(markets, comparisons):
    """Export NFL comparison results to JSON"""
    
    output_file = f"nfl_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Count by platform
    platform_counts = {}
    for market in markets:
        p = market.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "sport": "NFL",
        "summary": {
            "total_markets": len(markets),
            "by_platform": platform_counts,
            "matched_comparisons": len(comparisons),
            "arbitrage_opportunities": sum(1 for c in comparisons if c.arbitrage_opportunity)
        },
        "markets": [m.to_dict() for m in markets],
        "comparisons": [c.to_dict() for c in comparisons] if comparisons else []
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("=" * 70)
    print(f"📁 Results exported to: {output_file}")
    print("=" * 70)


def main():
    """Main execution"""
    
    try:
        # Fetch NFL markets
        markets = fetch_nfl_markets()
        
        # Compare markets
        comparisons = compare_nfl_markets(markets)
        
        # Export results
        export_results(markets, comparisons)
        
        # Summary
        print("\n" + "=" * 70)
        print("NFL COMPARISON COMPLETE")
        print("=" * 70)
        
        if comparisons:
            best = max(comparisons, key=lambda c: c.price_spread)
            print(f"\n🏆 Best Opportunity:")
            print(f"   {best.question}")
            print(f"   Best: {best.best_platform.value.upper()} @ {best.best_odds}")
            print(f"   Spread: {best.price_spread:.2f}%")
        
        print("\n💡 Tips:")
        print("   • Run this regularly to track price changes")
        print("   • For Kalshi access, set KALSHI_API_KEY environment variable")
        print("   • Check the exported JSON for detailed data")
        print("=" * 70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

