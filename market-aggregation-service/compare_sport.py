"""
Flexible Sports Comparison Tool

Usage:
    python compare_sport.py NFL
    python compare_sport.py NBA
    python compare_sport.py POLITICS
"""

import sys
import os
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from api_clients.limitless_client import LimitlessClient
from aggregator import MarketAggregator
from sports_config import get_sport_config, list_available_sports, is_platform_enabled


def fetch_markets_for_sport(sport_name: str):
    """Fetch markets for a specific sport from all enabled platforms"""
    
    print("\n" + "=" * 70)
    print(f"{sport_name.upper()} MARKET COMPARISON")
    print("=" * 70 + "\n")
    
    config = get_sport_config(sport_name)
    
    if not config:
        print(f"❌ No configuration found for sport: {sport_name}")
        print(f"\nAvailable sports: {', '.join(list_available_sports())}")
        return []
    
    all_markets = []
    
    # ========================================================================
    # Polymarket
    # ========================================================================
    if is_platform_enabled(sport_name, "polymarket"):
        poly_config = config["polymarket"]
        
        print(f"[Polymarket] Fetching {sport_name} markets...")
        print("-" * 70)
        
        try:
            client = PolymarketClient()
            
            params = {
                "limit": 200,
                "closed": False,
                "active": True
            }
            
            if poly_config.get("tag_id"):
                params["tag_id"] = poly_config["tag_id"]
                print(f"Using tag_id: {poly_config['tag_id']}")
            
            if poly_config.get("start_date_min"):
                params["start_date_min"] = poly_config["start_date_min"]
                print(f"Using start_date_min: {poly_config['start_date_min']}")
            
            markets = client.fetch_markets(**params)
            all_markets.extend(markets)
            
            print(f"✅ Fetched {len(markets)} markets")
            
            if markets:
                print("\nSample markets:")
                for market in markets[:3]:
                    print(f"  • {market.question}")
        
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    # ========================================================================
    # Kalshi
    # ========================================================================
    if is_platform_enabled(sport_name, "kalshi"):
        kalshi_config = config["kalshi"]
        
        print(f"[Kalshi] Fetching {sport_name} markets...")
        print("-" * 70)
        
        try:
            client = KalshiClient()
            
            params = {
                "status": "open",
                "limit": 200
            }
            
            if kalshi_config.get("series_ticker"):
                params["series_ticker"] = kalshi_config["series_ticker"]
                print(f"Using series_ticker: {kalshi_config['series_ticker']}")
            
            markets = client.fetch_markets(**params)
            all_markets.extend(markets)
            
            print(f"✅ Fetched {len(markets)} markets")
            
            if markets:
                print("\nSample markets:")
                for market in markets[:3]:
                    print(f"  • {market.question}")
                    print(f"    ID: {market.market_id}")
        
        except Exception as e:
            print(f"❌ Error: {e}")
            print("    (May require KALSHI_API_KEY environment variable)")
        
        print()
    
    # ========================================================================
    # Limitless
    # ========================================================================
    if is_platform_enabled(sport_name, "limitless"):
        limitless_config = config["limitless"]
        
        print(f"[Limitless] Fetching {sport_name} markets...")
        print("-" * 70)
        
        try:
            client = LimitlessClient()
            
            chain_id = limitless_config.get("chain_id", 2)
            print(f"Using chain_id: {chain_id}")
            
            markets = client.fetch_markets(
                chain_id=chain_id,
                limit=200
            )
            
            # Filter for the sport (Limitless doesn't have sport-specific filters)
            # This is approximate filtering
            filtered = [m for m in markets if sport_name.lower() in m.question.lower() or 
                       (m.category and sport_name.lower() in m.category.lower())]
            
            all_markets.extend(filtered)
            
            print(f"✅ Fetched {len(filtered)} {sport_name} markets (from {len(markets)} total)")
            
            if filtered:
                print("\nSample markets:")
                for market in filtered[:3]:
                    print(f"  • {market.question}")
        
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print()
    
    print("=" * 70)
    print(f"TOTAL {sport_name.upper()} MARKETS FETCHED: {len(all_markets)}")
    print("=" * 70)
    
    return all_markets


def compare_markets(sport_name: str, markets):
    """Compare markets across platforms"""
    
    if not markets:
        print("\n⚠️  No markets to compare!")
        return []
    
    print("\n" + "=" * 70)
    print(f"COMPARING {sport_name.upper()} MARKETS")
    print("=" * 70 + "\n")
    
    # Use aggregator
    aggregator = MarketAggregator()
    aggregator.all_markets = markets
    
    # Match
    matched_groups = aggregator.match_markets()
    
    if not matched_groups:
        print("\n⚠️  No matched markets found")
        print("     Markets may be worded too differently or have different time windows")
        return []
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Display results
    print("\n" + "=" * 70)
    print(f"FOUND {len(comparisons)} PRICE COMPARISONS")
    print("=" * 70 + "\n")
    
    for i, comp in enumerate(comparisons, 1):
        print(f"\n{i}. {comp.question}")
        print(f"   {'─' * 66}")
        
        for market in comp.markets:
            platform = market.platform.value.upper()
            print(f"\n   {platform}:")
            
            if market.outcomes:
                for outcome in market.outcomes:
                    is_best = (market.platform == comp.best_platform and 
                              outcome.name == comp.best_outcome_name)
                    marker = "⭐" if is_best else "  "
                    print(f"   {marker} {outcome.name}: {outcome.american_odds} ({outcome.price:.1%})")
        
        print(f"\n   🎯 BEST: {comp.best_platform.value.upper()} @ {comp.best_odds}")
        print(f"   📊 SPREAD: {comp.price_spread:.2f}%")
        
        if comp.arbitrage_opportunity:
            print(f"   💰 ARBITRAGE: {comp.arbitrage_percentage:.2f}%")
    
    return comparisons


def export_results(sport_name: str, markets, comparisons):
    """Export to JSON"""
    
    filename = f"{sport_name.lower()}_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    platform_counts = {}
    for m in markets:
        p = m.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "sport": sport_name.upper(),
        "summary": {
            "total_markets": len(markets),
            "by_platform": platform_counts,
            "comparisons": len(comparisons),
            "arbitrage_opportunities": sum(1 for c in comparisons if c.arbitrage_opportunity)
        },
        "comparisons": [c.to_dict() for c in comparisons]
    }
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("\n" + "=" * 70)
    print(f"📁 Exported to: {filename}")
    print("=" * 70 + "\n")


def main():
    """Main entry point"""
    
    if len(sys.argv) < 2:
        print("\n" + "=" * 70)
        print("SPORTS MARKET COMPARISON TOOL")
        print("=" * 70)
        print("\nUsage: python compare_sport.py <SPORT_NAME>")
        print(f"\nAvailable sports: {', '.join(list_available_sports())}")
        print("\nExamples:")
        print("  python compare_sport.py NFL")
        print("  python compare_sport.py NBA")
        print("  python compare_sport.py POLITICS")
        print("\n" + "=" * 70 + "\n")
        sys.exit(1)
    
    sport_name = sys.argv[1].upper()
    
    try:
        # Fetch markets
        markets = fetch_markets_for_sport(sport_name)
        
        if not markets:
            print("\n⚠️  No markets fetched. Check platform configurations.")
            return
        
        # Compare
        comparisons = compare_markets(sport_name, markets)
        
        # Export
        if comparisons:
            export_results(sport_name, markets, comparisons)
        
        # Summary
        print("=" * 70)
        print("COMPARISON COMPLETE")
        print("=" * 70)
        
        if comparisons:
            best = max(comparisons, key=lambda c: c.price_spread)
            print(f"\n🏆 Best Opportunity:")
            print(f"   {best.question[:60]}...")
            print(f"   {best.best_platform.value.upper()} @ {best.best_odds}")
            print(f"   Spread: {best.price_spread:.2f}%")
        
        print("\n💡 To add more sports, edit sports_config.py")
        print("=" * 70 + "\n")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

