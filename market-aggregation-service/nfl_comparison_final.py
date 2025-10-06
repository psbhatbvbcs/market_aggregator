"""
NFL Market Comparison - Final Version with Proper Filtering

Uses the exact same filtering logic as your Discord bot:
1. Fetch markets with tag_id and start_date_min
2. Filter with spread <= 0.05 (removes illiquid player props)
3. Filter to binary markets only (2 outcomes)

Usage:
    python nfl_comparison_final.py
"""

import sys
import os
import json
from datetime import datetime, timedelta, timezone
from dateutil import parser as date_parser

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from aggregator import MarketAggregator


def filter_future_markets(markets):
    """
    Filter markets by:
    1. Future gameStartTime (within 2 hours from now)
    2. Spread <= 0.05 (removes illiquid/prop markets)
    
    Adapted from discord_bot/commands/markets/helpers/polymarket_api.py
    """
    if not markets:
        return []
    
    future_markets = []
    now = datetime.now(timezone.utc) - timedelta(hours=2)
    
    print(f"Filtering {len(markets)} markets by time and spread...")
    
    for market in markets:
        # Check if market has gameStartTime in raw_data
        game_start_time_str = market.raw_data.get("gameStartTime")
        spread = market.raw_data.get('spread', 0.0)
        
        # Only include markets with spread <= 0.05 (liquid markets)
        if spread <= 0.05 and game_start_time_str:
            try:
                game_start_time = date_parser.parse(game_start_time_str)
                if game_start_time.tzinfo is None:
                    game_start_time = game_start_time.replace(tzinfo=timezone.utc)
                
                if game_start_time > now:
                    future_markets.append(market)
            except Exception as e:
                print(f"Warning: Error parsing time for market {market.market_id}: {e}")
                continue
    
    print(f"Found {len(future_markets)} markets with spread <= 0.05 and future start time")
    return future_markets


def filter_correct_markets(markets):
    """
    Filter to only include markets with exactly 2 outcomes.
    This is the final filter to ensure we only have binary markets.
    
    Adapted from discord_bot/commands/markets/helpers/polymarket_api.py
    """
    correct_markets = []
    
    for market in markets:
        try:
            outcomes = market.outcomes
            if len(outcomes) == 2:
                correct_markets.append(market)
        except Exception as e:
            print(f"Warning: Error checking outcomes for market {market.market_id}: {e}")
            continue
    
    print(f"Filtered to {len(correct_markets)} binary markets (2 outcomes only)")
    return correct_markets


def fetch_nfl_game_markets():
    """Fetch NFL game markets using the same logic as Discord bot"""
    
    print("\n" + "=" * 70)
    print("NFL GAME MARKETS COMPARISON (Discord Bot Logic)")
    print("=" * 70 + "\n")
    
    all_markets = []
    
    # ========================================================================
    # Fetch from Polymarket - Using exact Discord bot params
    # ========================================================================
    print("[1/2] Fetching NFL markets from Polymarket...")
    print("-" * 70)
    
    try:
        client = PolymarketClient()
        
        # Same params as Discord bot
        nfl_date = "2025-08-07T00:00:00Z"
        
        print(f"Using tag_id: 450 (NFL)")
        print(f"Using start_date_min: {nfl_date}")
        
        polymarket_markets = client.fetch_markets(
            limit=1000,
            closed=False,
            active=True,
            tag_id=450,
            start_date_min=nfl_date
        )
        
        print(f"✅ Fetched {len(polymarket_markets)} total NFL markets")
        
        # Apply Discord bot filtering
        print("\nApplying Discord bot filters...")
        
        # Step 1: Filter by spread and future time
        future_markets = filter_future_markets(polymarket_markets)
        
        # Step 2: Filter to binary markets only
        game_markets = filter_correct_markets(future_markets)
        
        all_markets.extend(game_markets)
        
        # Show examples
        if game_markets:
            print("\nExample Polymarket game markets:")
            for market in game_markets[:5]:
                print(f"  • {market.question}")
                spread = market.raw_data.get('spread', 'N/A')
                print(f"    Spread: {spread}, Outcomes: {[o.name for o in market.outcomes]}")
    
    except Exception as e:
        print(f"❌ Error fetching from Polymarket: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    
    # ========================================================================
    # Fetch from Kalshi
    # ========================================================================
    print("[2/2] Fetching NFL markets from Kalshi...")
    print("-" * 70)
    
    try:
        client = KalshiClient()
        
        print(f"Using series_ticker: KXNFLGAME")
        
        kalshi_markets = client.fetch_markets(
            series_ticker="KXNFLGAME",
            status="open",
            limit=200
        )
        
        print(f"✅ Fetched {len(kalshi_markets)} NFL game markets")
        
        all_markets.extend(kalshi_markets)
        
        # Show examples
        if kalshi_markets:
            print("\nExample Kalshi game markets:")
            for market in kalshi_markets[:5]:
                print(f"  • {market.question}")
                print(f"    Ticker: {market.market_id}")
    
    except Exception as e:
        print(f"❌ Error fetching from Kalshi: {e}")
        print("    (May require KALSHI_API_KEY environment variable)")
    
    print("\n" + "=" * 70)
    print(f"TOTAL NFL GAME MARKETS: {len(all_markets)}")
    print(f"  Polymarket: {len([m for m in all_markets if m.platform.value == 'polymarket'])}")
    print(f"  Kalshi: {len([m for m in all_markets if m.platform.value == 'kalshi'])}")
    print("=" * 70)
    
    return all_markets


def compare_markets(markets):
    """Compare NFL game markets across platforms"""
    
    if not markets:
        print("\n⚠️  No markets to compare!")
        return []
    
    print("\n" + "=" * 70)
    print("MATCHING NFL GAME MARKETS")
    print("=" * 70 + "\n")
    
    # Use aggregator
    aggregator = MarketAggregator()
    aggregator.all_markets = markets
    
    # Match
    matched_groups = aggregator.match_markets()
    
    if not matched_groups:
        print("\n⚠️  No matched markets found")
        print("\nShowing sample markets from each platform:")
        
        poly_markets = [m for m in markets if m.platform.value == 'polymarket']
        kalshi_markets = [m for m in markets if m.platform.value == 'kalshi']
        
        if poly_markets:
            print("\nPolymarket game markets:")
            for m in poly_markets[:5]:
                print(f"  • {m.question}")
                print(f"    Start: {m.start_time}")
        
        if kalshi_markets:
            print("\nKalshi game markets:")
            for m in kalshi_markets[:5]:
                print(f"  • {m.question}")
                print(f"    Start: {m.start_time}")
        
        return []
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Display results
    print("\n" + "=" * 70)
    print(f"🎉 FOUND {len(comparisons)} MATCHED GAMES!")
    print("=" * 70 + "\n")
    
    for i, comp in enumerate(comparisons, 1):
        print(f"\n{i}. {comp.question}")
        print(f"   {'─' * 66}")
        
        for market in comp.markets:
            platform = market.platform.value.upper()
            print(f"\n   {platform}:")
            print(f"   Market ID: {market.market_id}")
            
            if market.start_time:
                print(f"   Game Time: {market.start_time.strftime('%Y-%m-%d %H:%M UTC')}")
            
            if market.outcomes:
                for outcome in market.outcomes:
                    is_best = (market.platform == comp.best_platform and 
                              outcome.name == comp.best_outcome_name)
                    marker = "⭐" if is_best else "  "
                    print(f"   {marker} {outcome.name}: {outcome.american_odds} ({outcome.price:.1%})")
        
        print(f"\n   🎯 BEST ODDS: {comp.best_platform.value.upper()} @ {comp.best_odds}")
        print(f"   📊 PRICE SPREAD: {comp.price_spread:.2f}%")
        
        if comp.arbitrage_opportunity:
            print(f"   💰 ARBITRAGE: {comp.arbitrage_percentage:.2f}% profit!")
    
    return comparisons


def export_results(markets, comparisons):
    """Export to JSON"""
    
    filename = f"nfl_games_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    platform_counts = {}
    for m in markets:
        p = m.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "sport": "NFL",
        "filters_applied": [
            "spread <= 0.05 (liquid markets only)",
            "2 outcomes only (binary markets)",
            "future gameStartTime"
        ],
        "summary": {
            "total_markets": len(markets),
            "by_platform": platform_counts,
            "matched_comparisons": len(comparisons),
            "arbitrage_opportunities": sum(1 for c in comparisons if c.arbitrage_opportunity)
        },
        "markets": [m.to_dict() for m in markets],
        "comparisons": [c.to_dict() for c in comparisons]
    }
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print("\n" + "=" * 70)
    print(f"📁 Results exported to: {filename}")
    print("=" * 70)


def main():
    """Main execution"""
    
    try:
        # Fetch markets
        markets = fetch_nfl_game_markets()
        
        # Compare
        comparisons = compare_markets(markets)
        
        # Export
        export_results(markets, comparisons)
        
        # Summary
        print("\n" + "=" * 70)
        print("NFL GAME COMPARISON COMPLETE")
        print("=" * 70)
        
        if comparisons:
            best = max(comparisons, key=lambda c: c.price_spread)
            print(f"\n🏆 Best Opportunity:")
            print(f"   {best.question}")
            print(f"   Best: {best.best_platform.value.upper()} @ {best.best_odds}")
            print(f"   Spread: {best.price_spread:.2f}%")
        else:
            print("\n💡 Tips:")
            print("   • Check if games are happening this week")
            print("   • Polymarket may add markets closer to game time")
            print("   • For Kalshi auth: Set KALSHI_API_KEY environment variable")
        
        print("=" * 70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

