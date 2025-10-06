"""
NFL Market Comparison - Improved with proper filtering to exclude props

Uses the same logic as your Discord bot to filter out prop markets
and only compare game winner markets.

Usage:
    python nfl_comparison_improved.py
"""

import sys
import os
import json
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from api_clients.polymarket_client import PolymarketClient
from api_clients.kalshi_client import KalshiClient
from aggregator import MarketAggregator


def filter_correct_markets(markets):
    """
    Filter to only include markets with exactly 2 outcomes.
    This excludes prop bets which typically have 3+ outcomes.
    
    Adapted from discord_bot/commands/markets/helpers/polymarket_api.py
    """
    correct_markets = []
    for market in markets:
        try:
            outcomes = market.outcomes
            if len(outcomes) == 2:
                correct_markets.append(market)
        except Exception as e:
            print(f"Warning: Error processing market {market.market_id}: {e}")
            continue
    
    print(f"Filtered to {len(correct_markets)} binary markets (2 outcomes only)")
    return correct_markets


def fetch_nfl_game_markets():
    """Fetch NFL game markets (excluding props) from Polymarket and Kalshi"""
    
    print("\n" + "=" * 70)
    print("NFL GAME WINNER COMPARISON (Excluding Props)")
    print("=" * 70 + "\n")
    
    all_markets = []
    
    # ========================================================================
    # Fetch from Polymarket with date filter (like your Discord bot)
    # ========================================================================
    print("[1/2] Fetching NFL markets from Polymarket...")
    print("-" * 70)
    
    try:
        client = PolymarketClient()
        
        # Use start_date_min to get recent/upcoming games only
        # Using the same date as your Discord bot for consistency
        start_date_min = "2025-08-07T00:00:00Z"  # 2025 NFL season start
        
        print(f"Using tag_id: 450 (NFL)")
        print(f"Using start_date_min: {start_date_min}")
        
        polymarket_markets = client.fetch_markets(
            limit=500,
            closed=False,
            active=True,
            tag_id=450,  # NFL tag
            start_date_min=start_date_min
        )
        
        print(f"✅ Fetched {len(polymarket_markets)} total NFL markets")
        
        # Filter to only binary markets (excludes props)
        polymarket_games = filter_correct_markets(polymarket_markets)
        
        all_markets.extend(polymarket_games)
        
        # Show some examples
        if polymarket_games:
            print("\nExample Polymarket game markets (binary only):")
            for market in polymarket_games[:5]:
                print(f"  • {market.question}")
                print(f"    Outcomes: {[o.name for o in market.outcomes]}")
    
    except Exception as e:
        print(f"❌ Error fetching from Polymarket: {e}")
    
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
        
        # Show some examples
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
        print("\nPossible reasons:")
        print("  1. Markets are worded differently between platforms")
        print("  2. Polymarket may not have individual game markets yet")
        print("  3. Games are at different times")
        print("\nShowing sample markets from each platform for comparison:")
        
        poly_markets = [m for m in markets if m.platform.value == 'polymarket']
        kalshi_markets = [m for m in markets if m.platform.value == 'kalshi']
        
        if poly_markets:
            print("\nPolymarket samples:")
            for m in poly_markets[:3]:
                print(f"  • {m.question}")
        
        if kalshi_markets:
            print("\nKalshi samples:")
            for m in kalshi_markets[:3]:
                print(f"  • {m.question}")
        
        return []
    
    # Create comparisons
    comparisons = aggregator.create_comparisons()
    
    # Display results
    print("\n" + "=" * 70)
    print(f"FOUND {len(comparisons)} MATCHED GAMES")
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
    
    filename = f"nfl_games_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    platform_counts = {}
    for m in markets:
        p = m.platform.value
        platform_counts[p] = platform_counts.get(p, 0) + 1
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "sport": "NFL",
        "market_type": "Game Winners (Binary Markets Only)",
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
            print("   • Polymarket may not have individual NFL game markets")
            print("   • They focus more on season futures and player props")
            print("   • Try NBA or MLB for better game-by-game comparisons")
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

